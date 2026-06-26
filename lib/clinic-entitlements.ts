import { cache } from 'react'
import { redirect } from 'next/navigation'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getClinicUser } from '@/lib/clinic'
import {
  ALL_FEATURES,
  isSubscriptionActive,
  type EntitlementKey,
} from '@/lib/entitlements'

// ============================================================
// Server-side tier gating for the clinic portal. Resolves a clinic's entitlement
// row (mirrored from Core) and exposes page + API guards.
//
// A clinic WITHOUT a tenant_entitlements row falls back to ALL_FEATURES with status
// 'legacy' → keeps its exact current access (behaviour-preserving). Only clinics with
// an explicit row get the gated experience.
// ============================================================

export type ClinicEntitlements = {
  tier: string | null
  entitlements: EntitlementKey[]
  /** Active-doctor seat limit; null = unlimited. */
  maxActiveUsers: number | null
  /** active | trialing | trial | past_due | suspended | cancelled | expired | legacy */
  status: string
}

const LEGACY: ClinicEntitlements = {
  tier: null,
  entitlements: ALL_FEATURES,
  maxActiveUsers: null,
  status: 'legacy',
}

/**
 * Resolve the clinic's entitlement cache. Wrapped in React cache() so the page guard
 * and any sibling call in the same request share one DB round-trip. Reads via the
 * service-role client (bypasses RLS) — same pattern as the rest of the clinic app.
 */
export const getClinicEntitlements = cache(async (clinicId: string): Promise<ClinicEntitlements> => {
  if (!clinicId) return LEGACY
  const db = createAdminClient()
  const { data } = await db
    .from('tenant_entitlements')
    .select('tier, entitlements, max_active_users, status')
    .eq('clinic_id', clinicId)
    .maybeSingle()

  if (!data) return LEGACY

  return {
    tier: data.tier ?? null,
    entitlements: (data.entitlements as EntitlementKey[]) ?? [],
    maxActiveUsers: data.max_active_users ?? null,
    status: data.status ?? 'active',
  }
})

/** Pure check: does this resolved clinic hold the given feature (and is it in good standing)? */
export function hasEntitlement(ent: ClinicEntitlements, key: EntitlementKey): boolean {
  return isSubscriptionActive(ent.status) && ent.entitlements.includes(key)
}

const ROLE_HOME: Record<string, string> = {
  admin: '/admin',
  receptionist: '/receptionist',
  doctor: '/doctor',
}

/**
 * Page guard for a server component. Requires the feature or redirects to the role's
 * home with an upsell/billing query param. Returns the resolved ClinicUser +
 * entitlements so the page can reuse them without re-querying.
 *
 *   const { user } = await requireEntitlement('billing')
 */
export async function requireEntitlement(key: EntitlementKey) {
  const user = await getClinicUser()
  const ent = await getClinicEntitlements(user.clinic_id)
  const home = ROLE_HOME[user.role] ?? '/admin'

  if (!isSubscriptionActive(ent.status)) {
    redirect(`${home}?billing=${ent.status}`)
  }
  if (!ent.entitlements.includes(key)) {
    redirect(`${home}?upsell=${key}`)
  }
  return { user, ent }
}

/**
 * Action/route guard. Returns a ready 403 NextResponse when the clinic lacks the
 * feature (or the subscription is not in good standing), otherwise null — so a route
 * handler can do:  const g = await guardEntitlementApi(clinicId, 'pharmacy'); if (g) return g
 *
 * Defense-in-depth behind the page-level requireEntitlement(), so a direct API call
 * (bypassing the gated page) is blocked too.
 */
export async function guardEntitlementApi(
  clinicId: string,
  key: EntitlementKey,
): Promise<NextResponse | null> {
  const ent = await getClinicEntitlements(clinicId)
  if (!isSubscriptionActive(ent.status)) {
    return NextResponse.json(
      { error: 'Langganan Anda sedang tidak aktif. Perbarui pembayaran untuk melanjutkan.', billing: ent.status },
      { status: 403 },
    )
  }
  if (!ent.entitlements.includes(key)) {
    return NextResponse.json(
      { error: 'Fitur ini tidak tersedia di paket langganan Anda. Silakan tingkatkan paket.', upsell: key },
      { status: 403 },
    )
  }
  return null
}
