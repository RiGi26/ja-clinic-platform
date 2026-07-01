-- 013_locations_not_null.sql
-- ─────────────────────────────────────────────────────────────────────────────
-- B1d — CONTRACT phase of the multi-branch expand/contract migration.
--
-- location_id was added NULLABLE in B1a (012); B1b (admin: assign/walk-in) and
-- B1c (public booking + patient booking + demo seed) updated every doctor and
-- appointment writer to set it. Now enforce NOT NULL so a branch can never be
-- omitted from a therapist or a visit.
--
-- Self-healing: a safety backfill assigns any straggler NULL to the clinic's
-- default branch (prefer active, oldest first) BEFORE the constraint. Verified
-- 0 NULL at author time → no-op on live, but keeps the migration idempotent and
-- safe on a fresh rebuild or if a race ever left a NULL. Re-runnable:
-- SET NOT NULL on an already-NOT-NULL column is a no-op.
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE public.doctors d
SET location_id = (
  SELECT l.id FROM public.locations l
  WHERE l.clinic_id = d.clinic_id
  ORDER BY l.is_active DESC, l.created_at ASC, l.id ASC
  LIMIT 1
)
WHERE d.location_id IS NULL;

UPDATE public.appointments a
SET location_id = (
  SELECT l.id FROM public.locations l
  WHERE l.clinic_id = a.clinic_id
  ORDER BY l.is_active DESC, l.created_at ASC, l.id ASC
  LIMIT 1
)
WHERE a.location_id IS NULL;

ALTER TABLE public.doctors      ALTER COLUMN location_id SET NOT NULL;
ALTER TABLE public.appointments ALTER COLUMN location_id SET NOT NULL;
