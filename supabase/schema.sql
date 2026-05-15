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

-- ── RLS ────────────────────────────────────────────────────────────────
ALTER TABLE public.clinics            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_schedules   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queue_sessions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_records    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescriptions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications      ENABLE ROW LEVEL SECURITY;

-- Service role bypass semua (untuk server-side queries)
DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'clinics','users','doctors','patients','doctor_schedules',
    'queue_sessions','appointments','medical_records',
    'prescriptions','billing','notifications'
  ] LOOP
    EXECUTE format(
      'CREATE POLICY "service_role_bypass" ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)',
      tbl
    );
  END LOOP;
END $$;

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

-- ── Indexes (untuk performa query) ─────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_clinic       ON public.users(clinic_id);
CREATE INDEX IF NOT EXISTS idx_doctors_clinic     ON public.doctors(clinic_id);
CREATE INDEX IF NOT EXISTS idx_patients_clinic    ON public.patients(clinic_id);
CREATE INDEX IF NOT EXISTS idx_appointments_clinic ON public.appointments(clinic_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date  ON public.appointments(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_billing_clinic     ON public.billing(clinic_id);
CREATE INDEX IF NOT EXISTS idx_medical_clinic     ON public.medical_records(clinic_id);
