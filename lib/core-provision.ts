// ============================================================
// lib/core-provision.ts — register a clinic tenant in the superadmin Core DB.
//
// Clinic tenants live in this portal's own Supabase, but billing/subscriptions
// live in Core (SoR). On self-service signup we call Core to create a matching
// `tenants` row (platform='clinic') so the checkout token — which carries the Core
// tenant id — can later be resolved. Signed with BILLING_SYNC_SECRET (HMAC-SHA256
// over `${ts}\n${nonce}\n${body}`, the same scheme as /api/billing/sync and Core's
// /api/tenants/provision). Server-only — never import from a client component.
//
// Mirrors ja-stock-platform/src/lib/core-provision.ts (the canonical pattern).
// ============================================================
import crypto from 'crypto'
import { superadminBaseUrl } from '@/lib/billing-link'

export type ProvisionArgs = {
  slug: string
  name: string
  email: string
  phone?: string | null
  linkedTenantId: string // this portal's clinics.id (stored on Core as linked_tenant_id)
}

export type ProvisionResult =
  | { ok: true; coreTenantId: string }
  | { ok: false; error: string }

/**
 * Call Core `POST /api/tenants/provision`. Returns the Core tenant id. Caller
 * decides whether a failure is fatal — for signup we keep it non-fatal (the clinic
 * can still use the trial; a reconcile backfills linked_tenant_id later).
 */
export async function provisionCoreTenant(args: ProvisionArgs): Promise<ProvisionResult> {
  const secret = process.env.BILLING_SYNC_SECRET
  if (!secret) return { ok: false, error: 'BILLING_SYNC_SECRET belum di-set.' }

  const body = JSON.stringify({
    slug: args.slug,
    name: args.name,
    email: args.email,
    phone: args.phone ?? null,
    platform: 'clinic',
    linked_tenant_id: args.linkedTenantId,
  })

  const ts = String(Date.now())
  const nonce = crypto.randomBytes(16).toString('hex')
  const sig = crypto.createHmac('sha256', secret).update(`${ts}\n${nonce}\n${body}`).digest('hex')

  try {
    const res = await fetch(`${superadminBaseUrl()}/api/tenants/provision`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-ja-timestamp': ts,
        'x-ja-nonce': nonce,
        'x-ja-signature': sig,
      },
      body,
      // Signup is a cold path; bound it so a slow/down Core doesn't hang signup.
      signal: AbortSignal.timeout(8000),
    })
    const data = (await res.json().catch(() => ({}))) as { core_tenant_id?: string; error?: string }
    if (!res.ok || !data.core_tenant_id) {
      return { ok: false, error: data.error || `provision_failed_${res.status}` }
    }
    return { ok: true, coreTenantId: data.core_tenant_id }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'provision_error' }
  }
}
