-- 006 — Overload the shared `prescriptions` table so it serves BOTH:
--   System A (legacy): medical_record_id + medication_name/dosage/frequency/duration
--   System B (pharmacy/dispensing): appointment_id, patient_id, doctor_id, status,
--                                   prescription_number + prescription_items → medicines
-- Additive + non-destructive: existing legacy rows keep working. The two systems
-- coexist on one table, distinguished by which columns are populated
-- (System A: medical_record_id NOT NULL; System B: status NOT NULL).

-- 1) System B columns (all nullable so legacy rows remain valid)
ALTER TABLE public.prescriptions
  ADD COLUMN IF NOT EXISTS appointment_id      uuid,
  ADD COLUMN IF NOT EXISTS patient_id          uuid,
  ADD COLUMN IF NOT EXISTS doctor_id           uuid,
  ADD COLUMN IF NOT EXISTS status              text,
  ADD COLUMN IF NOT EXISTS prescription_number text;

-- 2) Relax legacy NOT NULLs so System B inserts (which omit them) are valid
ALTER TABLE public.prescriptions
  ALTER COLUMN medical_record_id DROP NOT NULL,
  ALTER COLUMN medication_name   DROP NOT NULL,
  ALTER COLUMN dosage            DROP NOT NULL,
  ALTER COLUMN frequency         DROP NOT NULL,
  ALTER COLUMN duration          DROP NOT NULL;

-- 3) Foreign keys for System B (ON DELETE SET NULL preserves the prescription
--    audit row if a parent appointment/patient/user is removed).
--    doctor_id stores a users.id (the doctor's auth user) per the API code.
DO $$ BEGIN
  ALTER TABLE public.prescriptions
    ADD CONSTRAINT prescriptions_appointment_id_fkey
    FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.prescriptions
    ADD CONSTRAINT prescriptions_patient_id_fkey
    FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.prescriptions
    ADD CONSTRAINT prescriptions_doctor_id_fkey
    FOREIGN KEY (doctor_id) REFERENCES public.users(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 4) Status domain (NULL for legacy rows; draft→confirmed→dispensed for System B)
DO $$ BEGIN
  ALTER TABLE public.prescriptions
    ADD CONSTRAINT prescriptions_status_check
    CHECK (status IS NULL OR status IN ('draft','confirmed','dispensed'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 5) prescription_number unique per clinic (ignores legacy NULLs)
CREATE UNIQUE INDEX IF NOT EXISTS prescriptions_clinic_number_uniq
  ON public.prescriptions (clinic_id, prescription_number)
  WHERE prescription_number IS NOT NULL;

-- 6) Lookup indexes for System B access paths
CREATE INDEX IF NOT EXISTS prescriptions_appointment_idx
  ON public.prescriptions (appointment_id) WHERE appointment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS prescriptions_clinic_status_idx
  ON public.prescriptions (clinic_id, status) WHERE status IS NOT NULL;
