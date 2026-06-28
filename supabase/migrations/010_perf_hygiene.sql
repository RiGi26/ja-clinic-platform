-- ============================================================
-- 010_perf_hygiene.sql  (DB performance audit 2026-06-28)
-- P1: covering index for every unindexed single-column FK (additive, zero behavior change)
-- P2: wrap bare auth.<fn>() in (select ...) so it is evaluated once per query (InitPlan),
--     not once per row. Behavior-preserving. Idempotent.
-- Applied to live DB via Supabase MCP; committed here for repo/DB parity.
-- ============================================================

-- P1: FK covering indexes
create index if not exists idx_appointments_doctor_id on public.appointments(doctor_id);
create index if not exists idx_appointments_patient_id on public.appointments(patient_id);
create index if not exists idx_billing_appointment_id on public.billing(appointment_id);
create index if not exists idx_billing_patient_id on public.billing(patient_id);
create index if not exists idx_booking_links_clinic_id on public.booking_links(clinic_id);
create index if not exists idx_doctor_schedules_clinic_id on public.doctor_schedules(clinic_id);
create index if not exists idx_doctor_schedules_doctor_id on public.doctor_schedules(doctor_id);
create index if not exists idx_doctors_user_id on public.doctors(user_id);
create index if not exists idx_medical_letters_appointment_id on public.medical_letters(appointment_id);
create index if not exists idx_medical_letters_doctor_id on public.medical_letters(doctor_id);
create index if not exists idx_medical_records_appointment_id on public.medical_records(appointment_id);
create index if not exists idx_medical_records_doctor_id on public.medical_records(doctor_id);
create index if not exists idx_medical_records_patient_id on public.medical_records(patient_id);
create index if not exists idx_medicine_transactions_clinic_id on public.medicine_transactions(clinic_id);
create index if not exists idx_medicine_transactions_created_by on public.medicine_transactions(created_by);
create index if not exists idx_notifications_clinic_id on public.notifications(clinic_id);
create index if not exists idx_patients_user_id on public.patients(user_id);
create index if not exists idx_prescription_items_medicine_id on public.prescription_items(medicine_id);
create index if not exists idx_prescription_items_prescription_id on public.prescription_items(prescription_id);
create index if not exists idx_prescriptions_doctor_id on public.prescriptions(doctor_id);
create index if not exists idx_prescriptions_medical_record_id on public.prescriptions(medical_record_id);
create index if not exists idx_prescriptions_patient_id on public.prescriptions(patient_id);
create index if not exists idx_queue_sessions_doctor_id on public.queue_sessions(doctor_id);
create index if not exists idx_shift_templates_user_id on public.shift_templates(user_id);
create index if not exists idx_staff_shifts_user_id on public.staff_shifts(user_id);

-- P2: RLS init-plan wrap. Self-targeting (only policies with a bare, not-already-wrapped
-- auth call) + idempotent. Reads the live expression and wraps each auth.<fn>() call.
do $$
declare
  r record; q text; wc text; v_sql text;
begin
  for r in
    select c.relname as tbl, p.polname as pol,
           pg_get_expr(p.polqual, p.polrelid) as q,
           pg_get_expr(p.polwithcheck, p.polrelid) as wc
    from pg_policy p
    join pg_class c on c.oid = p.polrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and (
        (pg_get_expr(p.polqual, p.polrelid) ~ 'auth\.(uid|jwt|role|email)\(\)'
           and pg_get_expr(p.polqual, p.polrelid) !~* '\(\s*select\s+auth\.')
        or
        (pg_get_expr(p.polwithcheck, p.polrelid) ~ 'auth\.(uid|jwt|role|email)\(\)'
           and pg_get_expr(p.polwithcheck, p.polrelid) !~* '\(\s*select\s+auth\.')
      )
  loop
    q := r.q; wc := r.wc;
    if q is not null then
      q := replace(q, 'auth.uid()',  '(select auth.uid())');
      q := replace(q, 'auth.jwt()',  '(select auth.jwt())');
      q := replace(q, 'auth.role()', '(select auth.role())');
      q := replace(q, 'auth.email()','(select auth.email())');
    end if;
    if wc is not null then
      wc := replace(wc, 'auth.uid()',  '(select auth.uid())');
      wc := replace(wc, 'auth.jwt()',  '(select auth.jwt())');
      wc := replace(wc, 'auth.role()', '(select auth.role())');
      wc := replace(wc, 'auth.email()','(select auth.email())');
    end if;
    v_sql := format('alter policy %I on public.%I', r.pol, r.tbl);
    if q  is not null then v_sql := v_sql || format(' using (%s)', q); end if;
    if wc is not null then v_sql := v_sql || format(' with check (%s)', wc); end if;
    execute v_sql;
    raise notice 'rewrapped: %', v_sql;
  end loop;
end $$;
