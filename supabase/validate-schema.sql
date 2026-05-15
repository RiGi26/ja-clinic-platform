-- ============================================================
-- Clinic Platform — Schema Validation
-- Jalankan di Supabase SQL Editor untuk cek apakah schema sudah benar
-- ============================================================

-- ── 1. CEK SEMUA TABEL ADA ───────────────────────────────────
SELECT
  t.table_name,
  CASE WHEN t.table_name IS NOT NULL THEN '✅ ADA' ELSE '❌ MISSING' END AS status
FROM (
  VALUES
    ('clinics'),
    ('users'),
    ('doctors'),
    ('patients'),
    ('doctor_schedules'),
    ('queue_sessions'),
    ('appointments'),
    ('medical_records'),
    ('prescriptions'),
    ('billing'),
    ('notifications')
) AS expected(table_name)
LEFT JOIN information_schema.tables t
  ON t.table_name = expected.table_name
  AND t.table_schema = 'public'
ORDER BY expected.table_name;

-- ── 2. CEK KOLOM PENTING ────────────────────────────────────
SELECT
  c.table_name,
  c.column_name,
  c.data_type,
  c.is_nullable,
  '✅' AS status
FROM information_schema.columns c
WHERE c.table_schema = 'public'
  AND c.table_name IN (
    'clinics','users','doctors','patients',
    'appointments','medical_records','billing'
  )
ORDER BY c.table_name, c.ordinal_position;

-- ── 3. CEK clinic_id ADA DI SEMUA TABEL ─────────────────────
SELECT
  expected.table_name,
  CASE
    WHEN c.column_name IS NOT NULL THEN '✅ clinic_id ada'
    ELSE '❌ clinic_id MISSING'
  END AS clinic_id_status
FROM (
  VALUES
    ('users'),('doctors'),('patients'),('doctor_schedules'),
    ('queue_sessions'),('appointments'),('medical_records'),
    ('prescriptions'),('billing'),('notifications')
) AS expected(table_name)
LEFT JOIN information_schema.columns c
  ON c.table_name = expected.table_name
  AND c.column_name = 'clinic_id'
  AND c.table_schema = 'public'
ORDER BY expected.table_name;

-- ── 4. CEK DATA DEMO SUDAH ADA ──────────────────────────────
SELECT 'clinics'      AS tabel, COUNT(*)::text AS jumlah FROM public.clinics
UNION ALL
SELECT 'users',             COUNT(*)::text FROM public.users
UNION ALL
SELECT 'doctors',           COUNT(*)::text FROM public.doctors
UNION ALL
SELECT 'patients',          COUNT(*)::text FROM public.patients
UNION ALL
SELECT 'appointments',      COUNT(*)::text FROM public.appointments
UNION ALL
SELECT 'billing',           COUNT(*)::text FROM public.billing;

-- ── 5. CEK USER DEMO ADA ────────────────────────────────────
SELECT
  u.id,
  u.email,
  u.role,
  u.status,
  u.clinic_id,
  CASE WHEN u.clinic_id IS NULL THEN '⚠️ clinic_id kosong' ELSE '✅ ok' END AS check_clinic
FROM public.users u
WHERE u.email = 'demo-admin@klinik-platform.com';

-- ── 6. CEK RLS POLICIES ──────────────────────────────────────
SELECT
  schemaname,
  tablename,
  policyname,
  '✅' AS status
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ── 7. SUMMARY FINAL ────────────────────────────────────────
DO $$
DECLARE
  missing_tables TEXT := '';
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['clinics','users','doctors','patients','appointments','medical_records','prescriptions','billing','notifications','doctor_schedules','queue_sessions']
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      missing_tables := missing_tables || tbl || ', ';
    END IF;
  END LOOP;

  IF missing_tables = '' THEN
    RAISE NOTICE '✅ SEMUA TABEL ADA — Schema sudah benar!';
  ELSE
    RAISE NOTICE '❌ TABEL MISSING: %', missing_tables;
    RAISE NOTICE 'Jalankan supabase/schema.sql terlebih dahulu!';
  END IF;
END $$;
