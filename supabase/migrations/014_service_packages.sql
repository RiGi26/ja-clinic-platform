-- 014_service_packages.sql
-- ─────────────────────────────────────────────────────────────────────────────
-- B2a — MULTI-SESSION PACKAGES foundation (Kamy Physio rehab: "10-sesi" paket).
--
-- Two tables + appointment links + atomic session mutators:
--   • service_packages              — a clinic's package CATALOG (what's on offer)
--   • patient_package_subscriptions — a patient's PURCHASE (snapshotted, tracks
--                                     remaining sessions + expiry)
--   • appointments.subscription_id  — the visit consumes a specific purchase
--     (FK to the subscription, NOT the catalog: a booking draws down one patient's
--      package instance; the catalog can change later without altering it)
--
-- Anti double-spend: consume_package_session locks the subscription row
-- (SELECT … FOR UPDATE) so concurrent bookings serialize — same pattern as the
-- medicine-stock RPCs (007). release_package_session refunds a session on cancel.
-- Both are service_role-only. Behavior-preserving: pay-per-visit bookings keep
-- subscription_id NULL, unchanged.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── service_packages (catalog) ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.service_packages (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id     uuid    NOT NULL REFERENCES public.clinics(id)    ON DELETE CASCADE,
  treatment_id  uuid    REFERENCES public.treatments(id)          ON DELETE SET NULL,  -- optional: which service the paket covers (null = umum)
  name          text    NOT NULL,
  num_sessions  integer NOT NULL CHECK (num_sessions > 0),
  price         integer NOT NULL DEFAULT 0 CHECK (price >= 0),                          -- rupiah, matches treatments.price
  validity_days integer CHECK (validity_days IS NULL OR validity_days > 0),             -- null = tanpa kedaluwarsa
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_service_packages_clinic_id    ON public.service_packages USING btree (clinic_id);
CREATE INDEX IF NOT EXISTS idx_service_packages_treatment_id ON public.service_packages USING btree (treatment_id);
ALTER TABLE public.service_packages ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='service_packages' AND policyname='service_role_bypass') THEN
    CREATE POLICY "service_role_bypass" ON public.service_packages FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── patient_package_subscriptions (a patient's purchase) ─────────────────────
-- sessions_total + price_paid are SNAPSHOTS at purchase time, so later catalog
-- edits never rewrite a patient's history. package_id is RESTRICT (soft-close a
-- catalog package via is_active instead of deleting one that has subscriptions).
CREATE TABLE IF NOT EXISTS public.patient_package_subscriptions (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id          uuid    NOT NULL REFERENCES public.clinics(id)          ON DELETE CASCADE,
  patient_id         uuid    NOT NULL REFERENCES public.patients(id)         ON DELETE CASCADE,
  package_id         uuid    NOT NULL REFERENCES public.service_packages(id) ON DELETE RESTRICT,
  purchased_at       timestamptz NOT NULL DEFAULT now(),
  sessions_total     integer NOT NULL CHECK (sessions_total > 0),
  sessions_remaining integer NOT NULL CHECK (sessions_remaining >= 0),
  price_paid         integer NOT NULL DEFAULT 0 CHECK (price_paid >= 0),
  expires_at         timestamptz,                                                        -- null = tanpa kedaluwarsa
  status             text    NOT NULL DEFAULT 'active'
                       CHECK (status IN ('active','completed','expired','cancelled')),
  created_at         timestamptz DEFAULT now(),
  CONSTRAINT remaining_le_total CHECK (sessions_remaining <= sessions_total)
);
CREATE INDEX IF NOT EXISTS idx_pps_clinic_id  ON public.patient_package_subscriptions USING btree (clinic_id);
CREATE INDEX IF NOT EXISTS idx_pps_patient_id ON public.patient_package_subscriptions USING btree (patient_id);
CREATE INDEX IF NOT EXISTS idx_pps_package_id ON public.patient_package_subscriptions USING btree (package_id);
ALTER TABLE public.patient_package_subscriptions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='patient_package_subscriptions' AND policyname='service_role_bypass') THEN
    CREATE POLICY "service_role_bypass" ON public.patient_package_subscriptions FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── appointments: link a visit to the subscription it drew down ───────────────
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS subscription_id uuid REFERENCES public.patient_package_subscriptions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS session_number  integer;
CREATE INDEX IF NOT EXISTS idx_appointments_subscription_id ON public.appointments USING btree (subscription_id);

-- ── RPC: consume one session (atomic, anti double-spend) ─────────────────────
-- Locks the subscription, validates active/not-expired/has-remaining, decrements,
-- flips to 'completed' when it hits 0, and stamps the appointment with its
-- session_number — all in one transaction.
CREATE OR REPLACE FUNCTION public.consume_package_session(
  p_subscription_id uuid,
  p_clinic_id       uuid,
  p_appointment_id  uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_status     text;
  v_total      integer;
  v_remaining  integer;
  v_expires    timestamptz;
  v_new_rem    integer;
  v_session_no integer;
  v_cnt        integer;
BEGIN
  SELECT status, sessions_total, sessions_remaining, expires_at
    INTO v_status, v_total, v_remaining, v_expires
  FROM patient_package_subscriptions
  WHERE id = p_subscription_id AND clinic_id = p_clinic_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_found');
  END IF;

  -- Lazy-expire: a subscription past its validity is marked and refused.
  IF v_expires IS NOT NULL AND v_expires <= now() THEN
    IF v_status = 'active' THEN
      UPDATE patient_package_subscriptions SET status = 'expired' WHERE id = p_subscription_id;
    END IF;
    RETURN jsonb_build_object('ok', false, 'code', 'expired');
  END IF;

  IF v_status <> 'active' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'inactive', 'status', v_status);
  END IF;

  IF v_remaining <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'code', 'depleted');
  END IF;

  v_new_rem    := v_remaining - 1;
  v_session_no := v_total - v_new_rem;  -- 1-based: 1st consume of a 10-pack → 10-9 = 1

  UPDATE patient_package_subscriptions
    SET sessions_remaining = v_new_rem,
        status = CASE WHEN v_new_rem = 0 THEN 'completed' ELSE 'active' END
  WHERE id = p_subscription_id;

  -- Stamp the appointment; it must belong to this clinic or we abort (rollback).
  UPDATE appointments
    SET subscription_id = p_subscription_id, session_number = v_session_no
  WHERE id = p_appointment_id AND clinic_id = p_clinic_id;
  GET DIAGNOSTICS v_cnt = ROW_COUNT;
  IF v_cnt = 0 THEN
    RAISE EXCEPTION 'appointment % not found in clinic %', p_appointment_id, p_clinic_id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'session_number', v_session_no,
                            'sessions_remaining', v_new_rem,
                            'status', CASE WHEN v_new_rem = 0 THEN 'completed' ELSE 'active' END);
END;
$$;

-- ── RPC: release (refund) a session — used on cancel/reschedule ──────────────
-- Idempotent-ish: clears the appointment link and returns the session to the
-- subscription (capped at total), reactivating a 'completed' subscription.
-- Leaves 'expired'/'cancelled' status untouched.
CREATE OR REPLACE FUNCTION public.release_package_session(
  p_appointment_id uuid,
  p_clinic_id      uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_sub       uuid;
  v_total     integer;
  v_remaining integer;
  v_status    text;
  v_new_rem   integer;
BEGIN
  SELECT subscription_id INTO v_sub
  FROM appointments
  WHERE id = p_appointment_id AND clinic_id = p_clinic_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'appt_not_found');
  END IF;

  IF v_sub IS NULL THEN
    RETURN jsonb_build_object('ok', true, 'code', 'no_package');
  END IF;

  SELECT sessions_total, sessions_remaining, status
    INTO v_total, v_remaining, v_status
  FROM patient_package_subscriptions
  WHERE id = v_sub AND clinic_id = p_clinic_id
  FOR UPDATE;

  IF FOUND THEN
    v_new_rem := LEAST(v_remaining + 1, v_total);
    UPDATE patient_package_subscriptions
      SET sessions_remaining = v_new_rem,
          status = CASE WHEN v_status = 'completed' AND v_new_rem > 0 THEN 'active' ELSE v_status END
    WHERE id = v_sub;
  END IF;

  UPDATE appointments
    SET subscription_id = NULL, session_number = NULL
  WHERE id = p_appointment_id AND clinic_id = p_clinic_id;

  RETURN jsonb_build_object('ok', true, 'refunded', v_sub IS NOT NULL);
END;
$$;

-- ── Least privilege: server-side admin client (service_role) only ────────────
REVOKE ALL ON FUNCTION public.consume_package_session(uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_package_session(uuid, uuid)       FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_package_session(uuid, uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_package_session(uuid, uuid)       TO service_role;
