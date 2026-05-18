-- Tambah role superadmin ke tabel users
ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE public.users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin','doctor','receptionist','patient','superadmin'));

-- Superadmin tidak terikat ke satu klinik (clinic_id bisa null)
ALTER TABLE public.users
  ALTER COLUMN clinic_id DROP NOT NULL;
