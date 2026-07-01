-- ============================================================
-- Clinic Platform — Multi-tenant SaaS Schema
-- Shared database, isolasi data via clinic_id + RLS
-- ============================================================

-- 0. Clinics (master tenant — satu row per klinik client)
CREATE TABLE IF NOT EXISTS public.clinics (
  id                UUID        NOT NULL DEFAULT gen_random_uuid(),
  name              TEXT        NOT NULL,
  slug              TEXT        UNIQUE NOT NULL,  -- untuk subdomain: slug.platform.com
  logo_url          TEXT,
  address           TEXT,
  phone             TEXT,
  email             TEXT,
  -- Jam operasional: {"mon":{"open":"08:00","close":"17:00"}, ...}
  working_hours     JSONB       DEFAULT '{}',
  -- Konfigurasi invoice
  bank_name         TEXT,
  bank_account      TEXT,
  bank_holder       TEXT,
  -- WA Notification
  fonnte_token      TEXT,
  -- Subscription
  plan              TEXT        NOT NULL DEFAULT 'trial'
                                CHECK (plan IN ('trial','basic','pro','custom')),
  plan_expires_at   TIMESTAMPTZ,
  is_active         BOOLEAN     NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT clinics_pkey PRIMARY KEY (id)
);

-- 0b. Locations / cabang (multi-branch). One branch per doctor; appointments
-- carry their own branch. Backfill of existing rows lives in migration 012.
CREATE TABLE IF NOT EXISTS public.locations (
  id            UUID        NOT NULL DEFAULT gen_random_uuid(),
  clinic_id     UUID        NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  name          TEXT        NOT NULL,
  address       TEXT,
  phone         TEXT,
  working_hours JSONB       DEFAULT '{}',
  is_active     BOOLEAN     NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT locations_pkey PRIMARY KEY (id)
);

-- 1. Users (semua role per klinik)
CREATE TABLE IF NOT EXISTS public.users (
  id         UUID        NOT NULL DEFAULT gen_random_uuid(),
  clinic_id  UUID        NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  email      TEXT        NOT NULL,
  full_name  TEXT        NOT NULL,
  phone      TEXT,
  role       TEXT        NOT NULL DEFAULT 'patient'
                         CHECK (role IN ('admin','doctor','receptionist','patient')),
  status     TEXT        NOT NULL DEFAULT 'active'
                         CHECK (status IN ('active','inactive')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id),
  UNIQUE (clinic_id, email)   -- email unik per klinik (beda klinik boleh sama)
);

-- 2. Doctors
CREATE TABLE IF NOT EXISTS public.doctors (
  id               UUID    NOT NULL DEFAULT gen_random_uuid(),
  clinic_id        UUID    NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  location_id      UUID    NOT NULL REFERENCES public.locations(id) ON DELETE RESTRICT,  -- cabang/home-branch (B1d: NOT NULL)
  user_id          UUID    REFERENCES public.users(id) ON DELETE SET NULL,
  full_name        TEXT    NOT NULL,  -- redundant tapi berguna untuk query cepat
  specialty        TEXT    NOT NULL,
  license_number   TEXT,
  consultation_fee INTEGER NOT NULL DEFAULT 0,
  bio              TEXT,
  avatar_url       TEXT,
  is_active        BOOLEAN DEFAULT true,
  created_at       TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT doctors_pkey PRIMARY KEY (id)
);

-- 3. Patients
CREATE TABLE IF NOT EXISTS public.patients (
  id                UUID    NOT NULL DEFAULT gen_random_uuid(),
  clinic_id         UUID    NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  user_id           UUID    REFERENCES public.users(id) ON DELETE SET NULL,
  no_rm             TEXT    NOT NULL,
  full_name         TEXT    NOT NULL,
  phone             TEXT,
  date_of_birth     DATE,
  gender            TEXT    CHECK (gender IN ('male','female','other')),
  blood_type        TEXT,
  allergies         TEXT,
  address           TEXT,
  emergency_contact TEXT,
  emergency_phone   TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT patients_pkey PRIMARY KEY (id),
  UNIQUE (clinic_id, no_rm)
);

-- 4. Doctor Schedules (jadwal praktek per hari)
CREATE TABLE IF NOT EXISTS public.doctor_schedules (
  id           UUID    NOT NULL DEFAULT gen_random_uuid(),
  clinic_id    UUID    NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  doctor_id    UUID    NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  day_of_week  INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time   TIME    NOT NULL,
  end_time     TIME    NOT NULL,
  max_patients INTEGER NOT NULL DEFAULT 10,
  is_active    BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT doctor_schedules_pkey PRIMARY KEY (id)
);

-- 5. Queue Sessions (antrian harian per dokter)
CREATE TABLE IF NOT EXISTS public.queue_sessions (
  id                UUID    NOT NULL DEFAULT gen_random_uuid(),
  clinic_id         UUID    NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  doctor_id         UUID    NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  date              DATE    NOT NULL,
  last_queue_number INTEGER NOT NULL DEFAULT 0,
  status            TEXT    NOT NULL DEFAULT 'open'
                            CHECK (status IN ('open','closed')),
  created_at        TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT queue_sessions_pkey PRIMARY KEY (id),
  UNIQUE (clinic_id, doctor_id, date)
);

-- 6. Appointments (janji temu)
CREATE TABLE IF NOT EXISTS public.appointments (
  id            UUID    NOT NULL DEFAULT gen_random_uuid(),
  clinic_id     UUID    NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  location_id   UUID    NOT NULL REFERENCES public.locations(id) ON DELETE RESTRICT,  -- cabang kunjungan, historis (B1d: NOT NULL)
  patient_id    UUID    NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id     UUID    REFERENCES public.doctors(id) ON DELETE SET NULL,
  scheduled_at  TIMESTAMPTZ NOT NULL,
  complaint     TEXT,
  status        TEXT    NOT NULL DEFAULT 'menunggu'
                        CHECK (status IN ('menunggu','dipanggil','diperiksa','selesai','batal')),
  type          TEXT    NOT NULL DEFAULT 'booking'
                        CHECK (type IN ('booking','walkin')),
  queue_number  INTEGER,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT appointments_pkey PRIMARY KEY (id)
);

-- 7. Medical Records (rekam medis per kunjungan)
CREATE TABLE IF NOT EXISTS public.medical_records (
  id                 UUID    NOT NULL DEFAULT gen_random_uuid(),
  clinic_id          UUID    NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  appointment_id     UUID    REFERENCES public.appointments(id) ON DELETE SET NULL,
  patient_id         UUID    NOT NULL REFERENCES public.patients(id),
  doctor_id          UUID    REFERENCES public.doctors(id),
  blood_pressure_sys INTEGER,
  blood_pressure_dia INTEGER,
  temperature        DECIMAL(4,1),
  weight             DECIMAL(5,1),
  height             DECIMAL(5,1),
  heart_rate         INTEGER,
  chief_complaint    TEXT,
  diagnoses          TEXT[]  DEFAULT '{}',
  treatment          TEXT,
  notes              TEXT,
  referral           TEXT,
  follow_up_date     DATE,
  created_at         TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT medical_records_pkey PRIMARY KEY (id)
);

-- 8. Prescriptions (resep obat)
CREATE TABLE IF NOT EXISTS public.prescriptions (
  id                UUID    NOT NULL DEFAULT gen_random_uuid(),
  clinic_id         UUID    NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  medical_record_id UUID    NOT NULL REFERENCES public.medical_records(id) ON DELETE CASCADE,
  medication_name   TEXT    NOT NULL,
  dosage            TEXT    NOT NULL,
  frequency         TEXT    NOT NULL,
  duration          TEXT    NOT NULL,
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT prescriptions_pkey PRIMARY KEY (id)
);
-- NB: prescriptions is shared by two systems. Migration 006 overloads it with the
-- pharmacy/dispensing columns (appointment_id, patient_id, doctor_id, status,
-- prescription_number) and relaxes the legacy NOT NULLs; migration 008 adds
-- updated_at (the prescriptions_updated_at trigger expects it).

-- 8a. Medicines (inventaris obat per klinik — System B pharmacy)
CREATE TABLE IF NOT EXISTS public.medicines (
  id           UUID    NOT NULL DEFAULT gen_random_uuid(),
  clinic_id    UUID    NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  name         TEXT    NOT NULL,
  generic_name TEXT,
  category     TEXT    NOT NULL DEFAULT 'obat'
                       CHECK (category IN ('obat','vitamin','alkes','lainnya')),
  unit         TEXT    NOT NULL DEFAULT 'tablet',
  stock        INTEGER NOT NULL DEFAULT 0,
  min_stock    INTEGER NOT NULL DEFAULT 10,
  price        INTEGER NOT NULL DEFAULT 0,
  description  TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT medicines_pkey PRIMARY KEY (id)
);

-- 8b. Prescription items (baris obat untuk resep System B)
CREATE TABLE IF NOT EXISTS public.prescription_items (
  id              UUID    NOT NULL DEFAULT gen_random_uuid(),
  prescription_id UUID    NOT NULL REFERENCES public.prescriptions(id) ON DELETE CASCADE,
  medicine_id     UUID    NOT NULL REFERENCES public.medicines(id),
  quantity        INTEGER NOT NULL CHECK (quantity > 0),
  dosage          TEXT    NOT NULL,
  duration        TEXT,
  notes           TEXT,
  CONSTRAINT prescription_items_pkey PRIMARY KEY (id)
);

-- 8c. Medicine transactions (kartu stok / ledger — audit tiap mutasi stok).
--     Mutations go through the atomic RPCs in migration 007, never raw UPDATEs.
CREATE TABLE IF NOT EXISTS public.medicine_transactions (
  id           UUID    NOT NULL DEFAULT gen_random_uuid(),
  clinic_id    UUID    NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  medicine_id  UUID    NOT NULL REFERENCES public.medicines(id),
  type         TEXT    NOT NULL CHECK (type IN ('masuk','keluar','adjustment')),
  quantity     INTEGER NOT NULL,
  stock_before INTEGER NOT NULL,
  stock_after  INTEGER NOT NULL,
  reference    TEXT,
  notes        TEXT,
  created_by   UUID    REFERENCES public.users(id),
  created_at   TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT medicine_transactions_pkey PRIMARY KEY (id)
);

-- 9. Billing (tagihan / invoice)
CREATE TABLE IF NOT EXISTS public.billing (
  id             UUID    NOT NULL DEFAULT gen_random_uuid(),
  clinic_id      UUID    NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  patient_id     UUID    NOT NULL REFERENCES public.patients(id),
  appointment_id UUID    REFERENCES public.appointments(id),
  invoice_number TEXT    NOT NULL,
  items          JSONB   NOT NULL DEFAULT '[]',
  subtotal       INTEGER NOT NULL DEFAULT 0,
  discount       INTEGER         DEFAULT 0,
  total          INTEGER NOT NULL DEFAULT 0,
  payment_method TEXT    CHECK (payment_method IN ('cash','transfer','bpjs','insurance')),
  status         TEXT    NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending','paid','cancelled')),
  paid_at        TIMESTAMPTZ,
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT billing_pkey PRIMARY KEY (id),
  UNIQUE (clinic_id, invoice_number)
);

-- 10. Notifications (log WA per klinik)
CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID    NOT NULL DEFAULT gen_random_uuid(),
  clinic_id  UUID    NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  type       TEXT    CHECK (type IN (
               'appointment_reminder','appointment_confirmed',
               'appointment_cancelled','billing_invoice','general'
             )),
  recipient  TEXT    NOT NULL,
  message    TEXT    NOT NULL,
  status     TEXT    NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','sent','failed')),
  sent_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id)
);

-- ── Schema-rot parity tables (created manually pre-repo; formalized in 011) ──
CREATE TABLE IF NOT EXISTS public.booking_links (
  id         UUID NOT NULL DEFAULT gen_random_uuid(),
  clinic_id  UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  slug       TEXT NOT NULL UNIQUE,
  is_active  BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT booking_links_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.medical_letters (
  id              UUID NOT NULL DEFAULT gen_random_uuid(),
  clinic_id       UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  patient_id      UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id       UUID REFERENCES public.doctors(id) ON DELETE SET NULL,
  appointment_id  UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  type            TEXT NOT NULL CHECK (type IN ('sakit','sehat','rujukan')),
  letter_number   TEXT NOT NULL,
  diagnosis       TEXT,
  notes           TEXT,
  sick_days       INTEGER,
  sick_from       DATE,
  sick_until      DATE,
  referred_to     TEXT,
  referral_reason TEXT,
  purpose         TEXT,
  is_healthy      BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT medical_letters_pkey PRIMARY KEY (id),
  CONSTRAINT medical_letters_clinic_id_letter_number_key UNIQUE (clinic_id, letter_number)
);

CREATE TABLE IF NOT EXISTS public.shift_templates (
  id          UUID NOT NULL DEFAULT gen_random_uuid(),
  clinic_id   UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  shift       TEXT NOT NULL CHECK (shift IN ('pagi','siang','malam','libur')),
  created_at  TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT shift_templates_pkey PRIMARY KEY (id),
  CONSTRAINT shift_templates_clinic_id_user_id_day_of_week_key UNIQUE (clinic_id, user_id, day_of_week)
);

CREATE TABLE IF NOT EXISTS public.staff_shifts (
  id         UUID NOT NULL DEFAULT gen_random_uuid(),
  clinic_id  UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  date       DATE NOT NULL,
  shift      TEXT NOT NULL CHECK (shift IN ('pagi','siang','malam','libur')),
  status     TEXT NOT NULL DEFAULT 'hadir' CHECK (status IN ('hadir','izin','sakit','alpha','libur')),
  notes      TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT staff_shifts_pkey PRIMARY KEY (id),
  CONSTRAINT staff_shifts_clinic_id_user_id_date_key UNIQUE (clinic_id, user_id, date)
);

-- ── RLS ────────────────────────────────────────────────────────────────
ALTER TABLE public.clinics            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_schedules   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queue_sessions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_records    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescriptions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medicines             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescription_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medicine_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_links      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_letters    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_templates    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_shifts       ENABLE ROW LEVEL SECURITY;

-- Service role bypass semua (untuk server-side queries)
DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'clinics','users','doctors','patients','doctor_schedules',
    'queue_sessions','appointments','medical_records',
    'prescriptions','medicines','prescription_items','medicine_transactions',
    'billing','notifications','locations',
    'medical_letters','staff_shifts','shift_templates'
  ] LOOP
    EXECUTE format(
      'CREATE POLICY "service_role_bypass" ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)',
      tbl
    );
  END LOOP;
END $$;

-- booking_links: clinic-scoped authenticated policy (not service_role_bypass)
CREATE POLICY "clinic_booking_links" ON public.booking_links FOR ALL
  USING (clinic_id IN (
    SELECT users.clinic_id FROM public.users WHERE users.id = (SELECT auth.uid())
  ));

-- ── Helper functions ────────────────────────────────────────────────────

-- Generate No. RM: RM-{YYYY}-{NNNN} per klinik
CREATE OR REPLACE FUNCTION generate_no_rm(p_clinic_id UUID)
RETURNS TEXT AS $$
DECLARE
  yr  TEXT := to_char(now(), 'YYYY');
  seq BIGINT;
BEGIN
  SELECT COUNT(*) + 1 INTO seq
    FROM public.patients
   WHERE clinic_id = p_clinic_id
     AND to_char(created_at, 'YYYY') = yr;
  RETURN 'RM-' || yr || '-' || LPAD(seq::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Generate invoice number: INV-{YYYY}{MM}-{NNNN} per klinik
CREATE OR REPLACE FUNCTION generate_invoice_number(p_clinic_id UUID)
RETURNS TEXT AS $$
DECLARE
  period TEXT := to_char(now(), 'YYYYMM');
  seq    BIGINT;
BEGIN
  SELECT COUNT(*) + 1 INTO seq
    FROM public.billing
   WHERE clinic_id = p_clinic_id
     AND to_char(created_at, 'YYYYMM') = period;
  RETURN 'INV-' || period || '-' || LPAD(seq::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Auto-set updated_at on UPDATE (search_path '' hardened — body uses only NOW())
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS staff_shifts_updated_at ON public.staff_shifts;
CREATE TRIGGER staff_shifts_updated_at
  BEFORE UPDATE ON public.staff_shifts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Indexes (untuk performa query) ─────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_clinic       ON public.users(clinic_id);
CREATE INDEX IF NOT EXISTS idx_doctors_clinic     ON public.doctors(clinic_id);
CREATE INDEX IF NOT EXISTS idx_patients_clinic    ON public.patients(clinic_id);
CREATE INDEX IF NOT EXISTS idx_appointments_clinic ON public.appointments(clinic_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date  ON public.appointments(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_billing_clinic     ON public.billing(clinic_id);
CREATE INDEX IF NOT EXISTS idx_medical_clinic     ON public.medical_records(clinic_id);
CREATE INDEX IF NOT EXISTS idx_locations_clinic_id      ON public.locations(clinic_id);
CREATE INDEX IF NOT EXISTS idx_doctors_location_id      ON public.doctors(location_id);
CREATE INDEX IF NOT EXISTS idx_appointments_location_id ON public.appointments(location_id);

-- ── Paket multi-sesi (B2, migration 014) ────────────────────────────────
-- Catalog (service_packages) + per-patient purchase (subscriptions). A visit
-- draws down a subscription atomically via the consume_package_session RPC —
-- defined in migration 014, not mirrored here (like the 007 stock RPCs).
CREATE TABLE IF NOT EXISTS public.service_packages (
  id            UUID        NOT NULL DEFAULT gen_random_uuid(),
  clinic_id     UUID        NOT NULL REFERENCES public.clinics(id)    ON DELETE CASCADE,
  treatment_id  UUID        REFERENCES public.treatments(id)          ON DELETE SET NULL,  -- opsional: layanan yg dicakup (null = umum)
  name          TEXT        NOT NULL,
  num_sessions  INTEGER     NOT NULL CHECK (num_sessions > 0),
  price         INTEGER     NOT NULL DEFAULT 0 CHECK (price >= 0),
  validity_days INTEGER     CHECK (validity_days IS NULL OR validity_days > 0),            -- null = tanpa kedaluwarsa
  is_active     BOOLEAN     NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT service_packages_pkey PRIMARY KEY (id)
);

-- sessions_total + price_paid = snapshot saat beli (edit katalog tak menulis ulang riwayat)
CREATE TABLE IF NOT EXISTS public.patient_package_subscriptions (
  id                 UUID        NOT NULL DEFAULT gen_random_uuid(),
  clinic_id          UUID        NOT NULL REFERENCES public.clinics(id)          ON DELETE CASCADE,
  patient_id         UUID        NOT NULL REFERENCES public.patients(id)         ON DELETE CASCADE,
  package_id         UUID        NOT NULL REFERENCES public.service_packages(id) ON DELETE RESTRICT,
  purchased_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  sessions_total     INTEGER     NOT NULL CHECK (sessions_total > 0),
  sessions_remaining INTEGER     NOT NULL CHECK (sessions_remaining >= 0),
  price_paid         INTEGER     NOT NULL DEFAULT 0 CHECK (price_paid >= 0),
  expires_at         TIMESTAMPTZ,                                                          -- null = tanpa kedaluwarsa
  status             TEXT        NOT NULL DEFAULT 'active'
                                 CHECK (status IN ('active','completed','expired','cancelled')),
  created_at         TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT patient_package_subscriptions_pkey PRIMARY KEY (id),
  CONSTRAINT remaining_le_total CHECK (sessions_remaining <= sessions_total)
);

-- appointments: kunjungan yg memakai satu sesi paket (null = bayar per-kunjungan)
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS subscription_id UUID REFERENCES public.patient_package_subscriptions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS session_number  INTEGER;

CREATE INDEX IF NOT EXISTS idx_service_packages_clinic_id      ON public.service_packages(clinic_id);
CREATE INDEX IF NOT EXISTS idx_service_packages_treatment_id   ON public.service_packages(treatment_id);
CREATE INDEX IF NOT EXISTS idx_pps_clinic_id                   ON public.patient_package_subscriptions(clinic_id);
CREATE INDEX IF NOT EXISTS idx_pps_patient_id                  ON public.patient_package_subscriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_pps_package_id                  ON public.patient_package_subscriptions(package_id);
CREATE INDEX IF NOT EXISTS idx_appointments_subscription_id    ON public.appointments(subscription_id);
