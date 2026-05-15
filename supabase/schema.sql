-- ============================================================
-- Clinic Platform — Database Schema
-- ============================================================

-- 1. Users (semua role: admin, doctor, patient)
CREATE TABLE IF NOT EXISTS public.users (
  id         UUID        NOT NULL DEFAULT gen_random_uuid(),
  email      TEXT        UNIQUE NOT NULL,
  full_name  TEXT        NOT NULL,
  phone      TEXT,
  role       TEXT        NOT NULL DEFAULT 'patient'
                         CHECK (role IN ('admin','doctor','patient')),
  status     TEXT        NOT NULL DEFAULT 'active'
                         CHECK (status IN ('active','inactive')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id)
);

-- 2. Doctors (profil dokter)
CREATE TABLE IF NOT EXISTS public.doctors (
  id               UUID    NOT NULL DEFAULT gen_random_uuid(),
  user_id          UUID    REFERENCES public.users(id) ON DELETE CASCADE,
  specialty        TEXT    NOT NULL,
  license_number   TEXT,
  consultation_fee INTEGER NOT NULL DEFAULT 0,
  bio              TEXT,
  is_active        BOOLEAN DEFAULT true,
  created_at       TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT doctors_pkey PRIMARY KEY (id)
);

-- 3. Patients (profil pasien)
CREATE TABLE IF NOT EXISTS public.patients (
  id                UUID    NOT NULL DEFAULT gen_random_uuid(),
  user_id           UUID    REFERENCES public.users(id) ON DELETE CASCADE,
  no_rm             TEXT    UNIQUE NOT NULL,
  date_of_birth     DATE,
  gender            TEXT    CHECK (gender IN ('male','female','other')),
  blood_type        TEXT    CHECK (blood_type IN ('A','B','AB','O','A+','A-','B+','B-','AB+','AB-','O+','O-')),
  allergies         TEXT,
  address           TEXT,
  emergency_contact TEXT,
  emergency_phone   TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT patients_pkey PRIMARY KEY (id)
);

-- 4. Doctor Schedules (jadwal praktek per hari)
CREATE TABLE IF NOT EXISTS public.doctor_schedules (
  id            UUID    NOT NULL DEFAULT gen_random_uuid(),
  doctor_id     UUID    REFERENCES public.doctors(id) ON DELETE CASCADE,
  day_of_week   INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Minggu
  start_time    TIME    NOT NULL,
  end_time      TIME    NOT NULL,
  max_patients  INTEGER NOT NULL DEFAULT 10,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT doctor_schedules_pkey PRIMARY KEY (id)
);

-- 5. Appointments (janji temu / antrian)
CREATE TABLE IF NOT EXISTS public.appointments (
  id            UUID    NOT NULL DEFAULT gen_random_uuid(),
  patient_id    UUID    REFERENCES public.patients(id) ON DELETE CASCADE,
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

-- 6. Medical Records (rekam medis per kunjungan)
CREATE TABLE IF NOT EXISTS public.medical_records (
  id                 UUID    NOT NULL DEFAULT gen_random_uuid(),
  appointment_id     UUID    REFERENCES public.appointments(id) ON DELETE CASCADE,
  patient_id         UUID    REFERENCES public.patients(id),
  doctor_id          UUID    REFERENCES public.doctors(id),
  -- Vital signs
  blood_pressure_sys INTEGER,
  blood_pressure_dia INTEGER,
  temperature        DECIMAL(4,1),
  weight             DECIMAL(5,1),
  height             DECIMAL(5,1),
  heart_rate         INTEGER,
  -- Medical info
  chief_complaint    TEXT,
  diagnoses          TEXT[]  DEFAULT '{}',
  treatment          TEXT,
  notes              TEXT,
  referral           TEXT,
  follow_up_date     DATE,
  created_at         TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT medical_records_pkey PRIMARY KEY (id)
);

-- 7. Prescriptions (resep obat)
CREATE TABLE IF NOT EXISTS public.prescriptions (
  id                UUID    NOT NULL DEFAULT gen_random_uuid(),
  medical_record_id UUID    REFERENCES public.medical_records(id) ON DELETE CASCADE,
  medication_name   TEXT    NOT NULL,
  dosage            TEXT    NOT NULL,
  frequency         TEXT    NOT NULL,
  duration          TEXT    NOT NULL,
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT prescriptions_pkey PRIMARY KEY (id)
);

-- 8. Billing (tagihan / invoice)
CREATE TABLE IF NOT EXISTS public.billing (
  id              UUID    NOT NULL DEFAULT gen_random_uuid(),
  patient_id      UUID    REFERENCES public.patients(id),
  appointment_id  UUID    REFERENCES public.appointments(id),
  invoice_number  TEXT    UNIQUE NOT NULL,
  items           JSONB   NOT NULL DEFAULT '[]',
  subtotal        INTEGER NOT NULL DEFAULT 0,
  discount        INTEGER         DEFAULT 0,
  total           INTEGER NOT NULL DEFAULT 0,
  payment_method  TEXT    CHECK (payment_method IN ('cash','transfer','bpjs','insurance')),
  status          TEXT    NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending','paid','cancelled')),
  paid_at         TIMESTAMPTZ,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT billing_pkey PRIMARY KEY (id)
);

-- 9. Notifications (log WA)
CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID    NOT NULL DEFAULT gen_random_uuid(),
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
ALTER TABLE public.users            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_records  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescriptions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications    ENABLE ROW LEVEL SECURITY;

-- Service role bypass semua RLS (untuk server-side queries)
CREATE POLICY "service_role_all" ON public.users            FOR ALL USING (true);
CREATE POLICY "service_role_all" ON public.doctors          FOR ALL USING (true);
CREATE POLICY "service_role_all" ON public.patients         FOR ALL USING (true);
CREATE POLICY "service_role_all" ON public.doctor_schedules FOR ALL USING (true);
CREATE POLICY "service_role_all" ON public.appointments     FOR ALL USING (true);
CREATE POLICY "service_role_all" ON public.medical_records  FOR ALL USING (true);
CREATE POLICY "service_role_all" ON public.prescriptions    FOR ALL USING (true);
CREATE POLICY "service_role_all" ON public.billing          FOR ALL USING (true);
CREATE POLICY "service_role_all" ON public.notifications    FOR ALL USING (true);

-- ── Helper function: generate No. RM ───────────────────────────────────
CREATE OR REPLACE FUNCTION generate_no_rm()
RETURNS TEXT AS $$
DECLARE
  yr TEXT := to_char(now(), 'YYYY');
  seq BIGINT;
BEGIN
  SELECT COUNT(*) + 1 INTO seq FROM public.patients
    WHERE to_char(created_at, 'YYYY') = yr;
  RETURN 'RM-' || yr || '-' || LPAD(seq::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;
