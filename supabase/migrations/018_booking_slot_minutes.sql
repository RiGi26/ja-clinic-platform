-- 018: interval slot booking per-klinik.
-- Fisioterapi (sesi 60 mnt) butuh slot per jam; klinik umum tetap 30 mnt.
-- Default 30 = perilaku lama → tenant existing nol perubahan (behavior-preserving).
alter table clinics
  add column if not exists booking_slot_minutes integer not null default 30;

comment on column clinics.booking_slot_minutes is
  'Interval slot booking publik dalam menit (mis. 30 = tiap setengah jam, 60 = tiap jam). Dipakai endpoint /api/booking/[slug]/slots dan /schedule.';
