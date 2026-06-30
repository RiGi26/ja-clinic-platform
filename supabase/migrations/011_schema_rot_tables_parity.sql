-- 011_schema_rot_tables_parity.sql
-- ─────────────────────────────────────────────────────────────────────────────
-- SCHEMA-ROT PARITY (B0). Four tables were created manually via the SQL editor
-- and only their indexes were recorded (migration 010_perf_hygiene); they had no
-- CREATE in the repo. This migration formally records them so a fresh rebuild
-- matches the live DB.
--
--   booking_links · medical_letters · staff_shifts · shift_templates
--
-- Also formalizes the shared `update_updated_at()` trigger helper, which until now
-- existed only on live (a latent fresh-rebuild gap shared with prescriptions).
--
-- FULLY IDEMPOTENT & BEHAVIOR-PRESERVING: every statement is guarded, so this is a
-- NO-OP on the existing live DB (tables/indexes/policies/trigger already present)
-- and complete on a fresh database. The only live change is hardening
-- update_updated_at with `SET search_path = ''` (clears function_search_path_mutable;
-- the body uses only NOW(), which always resolves via pg_catalog → no behavior change).
-- ─────────────────────────────────────────────────────────────────────────────

-- Shared trigger helper (sets updated_at on UPDATE). Hardened search_path.
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ── booking_links ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.booking_links (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id  uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  slug       text NOT NULL UNIQUE,
  is_active  boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_booking_links_clinic_id ON public.booking_links USING btree (clinic_id);
ALTER TABLE public.booking_links ENABLE ROW LEVEL SECURITY;
-- booking_links is the one rot table with a clinic-scoped authenticated policy
-- (the other three use service_role_bypass) — reproduced faithfully.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'booking_links' AND policyname = 'clinic_booking_links'
  ) THEN
    CREATE POLICY "clinic_booking_links" ON public.booking_links FOR ALL
      USING (clinic_id IN (
        SELECT users.clinic_id FROM public.users WHERE users.id = (SELECT auth.uid())
      ));
  END IF;
END $$;

-- ── medical_letters ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.medical_letters (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id       uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  patient_id      uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id       uuid REFERENCES public.doctors(id) ON DELETE SET NULL,
  appointment_id  uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  type            text NOT NULL CHECK (type = ANY (ARRAY['sakit', 'sehat', 'rujukan'])),
  letter_number   text NOT NULL,
  diagnosis       text,
  notes           text,
  sick_days       integer,
  sick_from       date,
  sick_until      date,
  referred_to     text,
  referral_reason text,
  purpose         text,
  is_healthy      boolean DEFAULT true,
  created_at      timestamptz DEFAULT now(),
  UNIQUE (clinic_id, letter_number)
);
CREATE INDEX IF NOT EXISTS idx_medical_letters_appointment_id ON public.medical_letters USING btree (appointment_id);
CREATE INDEX IF NOT EXISTS idx_medical_letters_clinic         ON public.medical_letters USING btree (clinic_id);
CREATE INDEX IF NOT EXISTS idx_medical_letters_doctor_id      ON public.medical_letters USING btree (doctor_id);
CREATE INDEX IF NOT EXISTS idx_medical_letters_patient        ON public.medical_letters USING btree (patient_id);
ALTER TABLE public.medical_letters ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'medical_letters' AND policyname = 'service_role_bypass'
  ) THEN
    CREATE POLICY "service_role_bypass" ON public.medical_letters FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── shift_templates ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.shift_templates (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id   uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  shift       text NOT NULL CHECK (shift = ANY (ARRAY['pagi', 'siang', 'malam', 'libur'])),
  created_at  timestamptz DEFAULT now(),
  UNIQUE (clinic_id, user_id, day_of_week)
);
CREATE INDEX IF NOT EXISTS idx_shift_templates_clinic  ON public.shift_templates USING btree (clinic_id);
CREATE INDEX IF NOT EXISTS idx_shift_templates_user_id ON public.shift_templates USING btree (user_id);
ALTER TABLE public.shift_templates ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'shift_templates' AND policyname = 'service_role_bypass'
  ) THEN
    CREATE POLICY "service_role_bypass" ON public.shift_templates FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── staff_shifts ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.staff_shifts (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id  uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  date       date NOT NULL,
  shift      text NOT NULL CHECK (shift = ANY (ARRAY['pagi', 'siang', 'malam', 'libur'])),
  status     text NOT NULL DEFAULT 'hadir' CHECK (status = ANY (ARRAY['hadir', 'izin', 'sakit', 'alpha', 'libur'])),
  notes      text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (clinic_id, user_id, date)
);
CREATE INDEX IF NOT EXISTS idx_staff_shifts_clinic  ON public.staff_shifts USING btree (clinic_id);
CREATE INDEX IF NOT EXISTS idx_staff_shifts_date    ON public.staff_shifts USING btree (clinic_id, date);
CREATE INDEX IF NOT EXISTS idx_staff_shifts_user_id ON public.staff_shifts USING btree (user_id);
ALTER TABLE public.staff_shifts ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'staff_shifts' AND policyname = 'service_role_bypass'
  ) THEN
    CREATE POLICY "service_role_bypass" ON public.staff_shifts FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'staff_shifts_updated_at' AND tgrelid = 'public.staff_shifts'::regclass
  ) THEN
    CREATE TRIGGER staff_shifts_updated_at
      BEFORE UPDATE ON public.staff_shifts
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;
END $$;
