-- 015_physio_progress.sql
-- ─────────────────────────────────────────────────────────────────────────────
-- B3 — PHYSIO PROGRESS TRACKING (Kamy Physio rehab: the 2nd core differentiator
-- after multi-session packages).
--
-- A rehab clinic documents a patient's improvement ACROSS sessions. This adds
-- per-session physio fields to the existing medical record + a session-photo
-- table + a clinic-level feature flag so only physio clinics see the UI.
--
--   • clinics.enable_physio        — feature gate (general clinics stay unchanged)
--   • medical_records.<physio>     — ROM (per-joint, JSONB), VAS pain pra/pasca,
--                                    prescribed exercises, adherence, next target
--   • visit_photos                 — before/after session photos (private bucket)
--
-- Behavior-preserving: every new column is nullable/defaulted; non-physio clinics
-- and existing records are untouched. RLS = service_role bypass only, matching the
-- rest of the schema (all access via the server-side admin client).
-- ─────────────────────────────────────────────────────────────────────────────

-- ── a. Feature flag ──────────────────────────────────────────────────────────
ALTER TABLE public.clinics
  ADD COLUMN IF NOT EXISTS enable_physio boolean NOT NULL DEFAULT false;

-- ── b. Per-session physio fields on the medical record ───────────────────────
-- rom_entries: JSONB array of { joint, before, after } (degrees). Structured
-- per-joint so the progress timeline can trend each joint, without a child table.
ALTER TABLE public.medical_records
  ADD COLUMN IF NOT EXISTS rom_entries          jsonb    DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS vas_pain_before      smallint CHECK (vas_pain_before BETWEEN 0 AND 10),
  ADD COLUMN IF NOT EXISTS vas_pain_after       smallint CHECK (vas_pain_after  BETWEEN 0 AND 10),
  ADD COLUMN IF NOT EXISTS prescribed_exercises text,
  ADD COLUMN IF NOT EXISTS adherence_notes      text,
  ADD COLUMN IF NOT EXISTS next_visit_target    text;

-- ── c. visit_photos ──────────────────────────────────────────────────────────
-- Loose links: a photo can be uploaded before the medical_record row exists
-- (during the session), so it attaches by appointment_id/patient_id first, then
-- the record insert backfills medical_record_id. All FKs to child data are
-- SET NULL on delete so photos survive as loose history rather than cascade away.
CREATE TABLE IF NOT EXISTS public.visit_photos (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id         uuid NOT NULL REFERENCES public.clinics(id)          ON DELETE CASCADE,
  patient_id        uuid NOT NULL REFERENCES public.patients(id)         ON DELETE CASCADE,
  appointment_id    uuid          REFERENCES public.appointments(id)     ON DELETE SET NULL,
  medical_record_id uuid          REFERENCES public.medical_records(id)  ON DELETE SET NULL,
  doctor_id         uuid          REFERENCES public.doctors(id)          ON DELETE SET NULL,
  storage_path      text NOT NULL,
  phase             text NOT NULL DEFAULT 'progress' CHECK (phase IN ('before','after','progress')),
  caption           text,
  created_at        timestamptz DEFAULT now()
);
-- FK covering indexes (DB hygiene standard)
CREATE INDEX IF NOT EXISTS idx_visit_photos_clinic_id         ON public.visit_photos USING btree (clinic_id);
CREATE INDEX IF NOT EXISTS idx_visit_photos_patient_id        ON public.visit_photos USING btree (patient_id);
CREATE INDEX IF NOT EXISTS idx_visit_photos_appointment_id    ON public.visit_photos USING btree (appointment_id);
CREATE INDEX IF NOT EXISTS idx_visit_photos_medical_record_id ON public.visit_photos USING btree (medical_record_id);
CREATE INDEX IF NOT EXISTS idx_visit_photos_doctor_id         ON public.visit_photos USING btree (doctor_id);
ALTER TABLE public.visit_photos ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='visit_photos' AND policyname='service_role_bypass') THEN
    CREATE POLICY "service_role_bypass" ON public.visit_photos FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── d. Private storage bucket for session photos ─────────────────────────────
-- Private: read via server-generated signed URLs (admin client bypasses RLS), so
-- no extra storage.objects policy is required. 5 MB cap, images only.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('visit-photos', 'visit-photos', false, 5242880, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;
