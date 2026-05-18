-- Tambah kolom SOAP ke medical_records
ALTER TABLE public.medical_records
  ADD COLUMN IF NOT EXISTS soap_subjective  TEXT,
  ADD COLUMN IF NOT EXISTS soap_objective   TEXT,
  ADD COLUMN IF NOT EXISTS soap_assessment  TEXT,
  ADD COLUMN IF NOT EXISTS soap_plan        TEXT,
  ADD COLUMN IF NOT EXISTS icd10_codes      TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS allergy_notes    TEXT;

-- Tambah kolom baru ke prescriptions
ALTER TABLE public.prescriptions
  ADD COLUMN IF NOT EXISTS route        TEXT,
  ADD COLUMN IF NOT EXISTS instructions TEXT;
