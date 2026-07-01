import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { createAdminClient } from '@/lib/supabase/server'
import {
  tierFeatures,
  isPlanTier,
  type EntitlementKey,
  type PlanTier,
  ALL_FEATURES,
} from '@/lib/entitlements'

// ============================================================
// PORTAL — POST /api/billing/sync. Receives a clinic's subscription/entitlement
// state from the superadmin Core DB (SoR) and mirrors it into tenant_entitlements
// (the local read cache that the app's gating consults).
//
// Core calls this fire-and-forget (after()) on subscription change; the reconcile
// cron is the safety net. Auth = HMAC-SHA256 over `${ts}\n${nonce}\n${rawBody}`
// with the shared BILLING_SYNC_SECRET (same scheme as Core's clinic-sync sender +
// /api/tenants/provision). Writes via service-role (bypasses RLS by design —
// tenant_entitlements is read-only for the UI).
//
// Body: {
//   tenant_slug: string,            // Core tenants.slug (fallback lookup key)
//   linked_tenant_id?: string,      // Core tenants.id (primary lookup key)
//   plan_tier: 'starter'|'growth'|'pro',
//   entitlements?: string[],        // explicit feature keys; derived from tier if omitted
//   max_active_users?: number|null, // null = unlimited
//   status?: string,                // active | trial | past_due | suspended | cancelled
//   expires_at?: string|null,       // ISO timestamp
//   event?: string                  // audit label, optional
// }
// ============================================================
export const dynamic = 'force-dynamic'

const MAX_SKEW_MS = 5 * 60_000
const VALID_TIERS: PlanTier[] = ['starter', 'growth', 'pro']
const KNOWN_KEYS = new Set<EntitlementKey>(ALL_FEATURES)

function verifyHmac(rawBody: string, headers: Headers, secret: string): boolean {
  const ts = headers.get('x-ja-timestamp')
  const nonce = headers.get('x-ja-nonce')
  const sig = headers.get('x-ja-signature')
  if (!ts || !nonce || !sig) return false
  const tsNum = Number(ts)
  if (!Number.isFinite(tsNum) || Math.abs(Date.now() - tsNum) > MAX_SKEW_MS) return false
  const expected = crypto.createHmac('sha256', secret).update(`${ts}\n${nonce}\n${rawBody}`).digest('hex')
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

export async function POST(request: Request) {
  const rawBody = await request.text()

  const secret = process.env.BILLING_SYNC_SECRET
  if (!secret) {
    console.error('[billing/sync] BILLING_SYNC_SECRET belum di-set')
    return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 })
  }
  if (!verifyHmac(rawBody, request.headers, secret)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  let body: any
  try {
    body = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 })
  }

  const tenantSlug = typeof body.tenant_slug === 'string' ? body.tenant_slug.trim() : ''
  const linkedTenantId = typeof body.linked_tenant_id === 'string' ? body.linked_tenant_id : null
  const tier = body.plan_tier as string
  if (!isPlanTier(tier) || !VALID_TIERS.includes(tier)) {
    return NextResponse.json({ ok: false, error: 'invalid_plan_tier' }, { status: 400 })
  }
  if (!tenantSlug && !linkedTenantId) {
    return NextResponse.json({ ok: false, error: 'missing_tenant_key' }, { status: 400 })
  }

  // Explicit entitlements win (filtered to known keys); otherwise derive from tier.
  const entitlements: EntitlementKey[] = Array.isArray(body.entitlements)
    ? (body.entitlements as unknown[]).filter((k): k is EntitlementKey => KNOWN_KEYS.has(k as EntitlementKey))
    : tierFeatures(tier)

  const maxActiveUsers =
    body.max_active_users === null || body.max_active_users === undefined
      ? null
      : Number(body.max_active_users)
  const status = typeof body.status === 'string' ? body.status : 'active'
  const expiresAt = typeof body.expires_at === 'string' ? body.expires_at : null

  const db = createAdminClient()

  // Resolve the local clinic_id. Prefer the Core id via an existing entitlement row
  // (exact, set at signup); fall back to the clinic slug.
  let clinicId: string | null = null
  if (linkedTenantId) {
    const { data: ent } = await db
      .from('tenant_entitlements')
      .select('clinic_id')
      .eq('linked_tenant_id', linkedTenantId)
      .maybeSingle()
    clinicId = (ent?.clinic_id as string | undefined) ?? null
  }
  if (!clinicId && tenantSlug) {
    const { data: clinic } = await db
      .from('clinics')
      .select('id')
      .eq('slug', tenantSlug)
      .maybeSingle()
    clinicId = (clinic?.id as string | undefined) ?? null
  }
  if (!clinicId) {
    return NextResponse.json({ ok: false, error: 'tenant_not_found' }, { status: 404 })
  }

  const { error: upErr } = await db.from('tenant_entitlements').upsert(
    {
      clinic_id:        clinicId,
      tier,
      entitlements,
      max_active_users: Number.isFinite(maxActiveUsers as number) ? maxActiveUsers : null,
      status,
      linked_tenant_id: linkedTenantId,
      synced_at:        new Date().toISOString(),
      expires_at:       expiresAt,
    },
    { onConflict: 'clinic_id' },
  )
  if (upErr) {
    console.error('[billing/sync] upsert failed:', upErr)
    return NextResponse.json({ ok: false, error: 'db_error' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, clinic_id: clinicId, tier, entitlements })
}
