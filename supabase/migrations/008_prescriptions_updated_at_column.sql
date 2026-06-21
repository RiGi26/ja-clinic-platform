-- 008 — The prescriptions table carries a `prescriptions_updated_at` trigger
-- (BEFORE UPDATE → update_updated_at()) that sets NEW.updated_at, but the column
-- was never created. So every UPDATE on prescriptions — confirming or dispensing
-- a System-B prescription — errored with "record new has no field updated_at",
-- silently breaking the whole pharmacy flow. Add the column the trigger expects.
ALTER TABLE public.prescriptions
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
