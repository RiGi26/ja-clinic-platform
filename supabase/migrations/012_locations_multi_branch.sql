-- 012_locations_multi_branch.sql
-- ─────────────────────────────────────────────────────────────────────────────
-- B1a — MULTI-BRANCH FOUNDATION (Kamy Physio: 4 cabang).
-- Introduces `locations` and tags doctors + appointments with a branch.
--
-- Cardinality: ONE branch per doctor (`doctors.location_id`, MUTABLE → supports
-- moving a therapist to another branch and resign/replace). Appointments carry
-- their OWN `location_id` (the branch of that visit) so history stays correct
-- even after a therapist later changes branch. Treatments stay clinic-wide
-- (uniform pricing across branches).
--
-- EXPAND/CONTRACT — this is the EXPAND phase, behavior-preserving:
--   • locations created; location_id added as NULLABLE and backfilled for all
--     existing rows (one default branch per clinic).
--   • location_id is intentionally NOT yet NOT NULL — existing INSERT sites
--     (booking/walk-in/doctor create) don't set it yet; forcing NOT NULL now
--     would break live writes. B1b/B1c update every writer; the CONTRACT step
--     (migration B1d) enforces NOT NULL once all writers set it.
--
-- Data at apply time is tiny (1 clinic, 4 doctors, 40 appointments) so the
-- backfill assigns every existing row to its clinic's default branch → zero
-- regression. Re-runnable (guarded).
-- ─────────────────────────────────────────────────────────────────────────────

-- ── locations ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.locations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id     uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  name          text NOT NULL,
  address       text,
  phone         text,
  working_hours jsonb DEFAULT '{}'::jsonb,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_locations_clinic_id ON public.locations USING btree (clinic_id);
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'locations' AND policyname = 'service_role_bypass'
  ) THEN
    CREATE POLICY "service_role_bypass" ON public.locations FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── location_id columns (NULLABLE in this phase) ──────────────────────────────
-- ON DELETE RESTRICT: a branch with doctors/appointments cannot be hard-deleted
-- (forces reassignment first); branches are soft-closed via is_active = false.
ALTER TABLE public.doctors      ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES public.locations(id) ON DELETE RESTRICT;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES public.locations(id) ON DELETE RESTRICT;

-- ── Backfill: one default branch per clinic, then tag existing rows ───────────
-- Default branch inherits the clinic's current contact details (faithful
-- representation of today's single location). Guarded: only clinics with no
-- branch yet get one.
INSERT INTO public.locations (clinic_id, name, address, phone, working_hours)
SELECT c.id, 'Cabang Utama', c.address, c.phone, COALESCE(c.working_hours, '{}'::jsonb)
FROM public.clinics c
WHERE NOT EXISTS (SELECT 1 FROM public.locations l WHERE l.clinic_id = c.id);

UPDATE public.doctors d
SET location_id = (
  SELECT l.id FROM public.locations l
  WHERE l.clinic_id = d.clinic_id
  ORDER BY l.created_at ASC, l.id ASC
  LIMIT 1
)
WHERE d.location_id IS NULL;

UPDATE public.appointments a
SET location_id = (
  SELECT l.id FROM public.locations l
  WHERE l.clinic_id = a.clinic_id
  ORDER BY l.created_at ASC, l.id ASC
  LIMIT 1
)
WHERE a.location_id IS NULL;

-- ── FK covering indexes (perf standard) ──────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_doctors_location_id      ON public.doctors      USING btree (location_id);
CREATE INDEX IF NOT EXISTS idx_appointments_location_id ON public.appointments USING btree (location_id);

-- NOTE: NOT NULL on doctors.location_id / appointments.location_id is enforced
-- in a later migration (B1d) once B1b/B1c update every INSERT site to set it.
