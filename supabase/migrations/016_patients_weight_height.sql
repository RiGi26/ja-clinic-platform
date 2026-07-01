-- 016_patients_weight_height.sql
-- ─────────────────────────────────────────────────────────────────────────────
-- FIX schema drift: `patients` lacked weight/height columns that the app has long
-- expected. The doctor medical-record form embeds `patients(… weight, height)` in
-- its appointment query (app/doctor/records/page.tsx + api/doctor/records) and
-- pre-fills the vitals from them — but the columns never existed on the live DB,
-- so PostgREST rejected the embed and the form redirected to /doctor for EVERY
-- clinic. Adding them (nullable, matching medical_records' DECIMAL(5,1)) unblocks
-- the form. Behavior-preserving: nullable, no backfill needed.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS weight numeric(5,1),
  ADD COLUMN IF NOT EXISTS height numeric(5,1);
