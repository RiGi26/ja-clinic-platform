CREATE TABLE IF NOT EXISTS public.treatments (
  id           UUID    NOT NULL DEFAULT gen_random_uuid(),
  clinic_id    UUID    NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  name         TEXT    NOT NULL,
  category     TEXT    NOT NULL DEFAULT 'umum',
  price        INTEGER NOT NULL DEFAULT 0,
  description  TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT treatments_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_treatments_clinic ON public.treatments(clinic_id);

ALTER TABLE public.treatments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_bypass" ON public.treatments
  FOR ALL TO service_role USING (true) WITH CHECK (true);
