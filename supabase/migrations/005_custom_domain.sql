-- Tambah kolom custom_domain ke tabel clinics
ALTER TABLE public.clinics
  ADD COLUMN IF NOT EXISTS custom_domain TEXT UNIQUE;

-- Index untuk lookup cepat via domain
CREATE INDEX IF NOT EXISTS idx_clinics_custom_domain
  ON public.clinics(custom_domain)
  WHERE custom_domain IS NOT NULL;
