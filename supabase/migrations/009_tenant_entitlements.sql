-- 009 — Tier gating (Fase A). Local cache of the per-clinic subscription package
-- (Starter / Growth / Pro). Source of truth = superadmin Core (mirrored here via a
-- billing-sync webhook in Fase B); this table lets the app gate features server-side
-- already. A clinic WITHOUT a row keeps full access (status 'legacy') so existing
-- clinics never lose features — behaviour-preserving (CLAUDE.md migration rule).
CREATE TABLE IF NOT EXISTS public.tenant_entitlements (
  clinic_id        uuid PRIMARY KEY REFERENCES public.clinics(id) ON DELETE CASCADE,
  tier             text NOT NULL DEFAULT 'starter',          -- starter | growth | pro
  entitlements     jsonb NOT NULL DEFAULT '[]'::jsonb,        -- EntitlementKey[]
  max_active_users integer,                                   -- active doctors; null = unlimited
  status           text NOT NULL DEFAULT 'active',            -- active|trialing|trial|past_due|suspended|cancelled|expired
  linked_tenant_id uuid,                                      -- Core tenant uuid (set in Fase B)
  synced_at        timestamptz DEFAULT now(),
  expires_at       timestamptz,
  created_at       timestamptz DEFAULT now()
);

-- Reverse lookup from a Core tenant uuid → clinic (used by the Fase B billing sync).
CREATE INDEX IF NOT EXISTS idx_tenant_entitlements_linked_tenant
  ON public.tenant_entitlements (linked_tenant_id);

ALTER TABLE public.tenant_entitlements ENABLE ROW LEVEL SECURITY;

-- Read-own: a clinic member may read their own clinic's entitlement row. The app
-- itself reads via the service-role client (bypasses RLS); this policy is a backstop
-- for any anon/authenticated path. Writes are service-role only (no write policy).
DROP POLICY IF EXISTS tenant_entitlements_read_own ON public.tenant_entitlements;
CREATE POLICY tenant_entitlements_read_own ON public.tenant_entitlements
  FOR SELECT
  USING (
    clinic_id = (SELECT clinic_id FROM public.users WHERE id = (SELECT auth.uid()))
  );
