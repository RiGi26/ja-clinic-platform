// ============================================================
// Fine-grained entitlement contract — local mirror of the superadmin Core DB
// (`subscription_plans`). Source of truth = Core; this file defines the SHAPE so the
// app can gate features server-side even before Core sync is wired (Fase B).
//
// Starter is the baseline (antrian/janji-temu, pasien, rekam-medis+resep, surat) and
// is always allowed. Only the upsell keys below are gated. Each tier is cumulative
// (includes the lower tiers').
//
// Pricing-page → key mapping (owner-approved TIER_MATRIX_PROPOSAL):
//   Starter : appointments, patients, records, letters              + 1 dokter
//   Growth  : + billing, pharmacy, reports, shifts, notifications   + 3 dokter
//   Pro     : + booking_link, white_label                           + unlimited
// ============================================================

export type EntitlementKey =
  | 'appointments'  // antrian, janji-temu, jadwal dokter, check-in
  | 'patients'      // database pasien
  | 'records'       // rekam medis (SOAP) + resep
  | 'letters'       // surat keterangan
  | 'billing'       // keuangan & invoice
  | 'pharmacy'      // stok obat (apotek) + dispensing
  | 'reports'       // laporan analitik & ekspor
  | 'shifts'        // jadwal/absensi staf
  | 'notifications' // notifikasi WhatsApp
  | 'booking_link'  // tautan booking publik + QR
  | 'white_label'   // branding penuh / custom domain

export type PlanTier = 'starter' | 'growth' | 'pro'

/** Baseline features every clinic gets (Starter). */
const STARTER: EntitlementKey[] = ['appointments', 'patients', 'records', 'letters']
const GROWTH: EntitlementKey[] = ['billing', 'pharmacy', 'reports', 'shifts', 'notifications']
const PRO: EntitlementKey[] = ['booking_link', 'white_label']

/** Cumulative feature set per tier (each tier includes the lower tiers'). */
export const TIER_FEATURES: Record<PlanTier, EntitlementKey[]> = {
  starter: STARTER,
  growth: [...STARTER, ...GROWTH],
  pro: [...STARTER, ...GROWTH, ...PRO],
}

/** Every key — granted to clinics without an entitlement row (legacy/full access). */
export const ALL_FEATURES: EntitlementKey[] = [...STARTER, ...GROWTH, ...PRO]

/** Active-doctor seat limit per tier (null = unlimited). */
export const TIER_SEATS: Record<PlanTier, number | null> = {
  starter: 1,
  growth: 3,
  pro: null,
}

export const DEFAULT_TIER: PlanTier = 'starter'

export function isPlanTier(tier: string | null | undefined): tier is PlanTier {
  return tier === 'starter' || tier === 'growth' || tier === 'pro'
}

export function tierFeatures(tier: string | null | undefined): EntitlementKey[] {
  return isPlanTier(tier) ? TIER_FEATURES[tier] : TIER_FEATURES[DEFAULT_TIER]
}

export function tierSeatLimit(tier: string | null | undefined): number | null {
  return isPlanTier(tier) ? TIER_SEATS[tier] : TIER_SEATS[DEFAULT_TIER]
}

// ────────────────────────────────────────────────────────────
// Core → clinic tier map. Core's superadmin plans use a different vocabulary
// (starter/pro/enterprise); the clinic portal uses starter/growth/pro. Mirrors the
// Stock mapping. Used by the Fase B billing-sync caller.
// ────────────────────────────────────────────────────────────
export function coreTierToClinic(coreTier: string | null | undefined): PlanTier {
  switch (coreTier) {
    case 'pro':
      return 'growth'
    case 'enterprise':
      return 'pro'
    case 'starter':
    default:
      return 'starter'
  }
}

// ────────────────────────────────────────────────────────────
// Subscription status — "good standing" lets a clinic use the features its tier
// grants. 'legacy' = clinics without a tenant_entitlements row (never billed here)
// → always allowed. Anything not in this set (past_due/suspended/cancelled/expired)
// revokes access to gated features even if the entitlements list still holds them —
// so Core can suspend by flipping status alone, without zeroing the array.
// ────────────────────────────────────────────────────────────
export const ACTIVE_STATUSES = new Set(['active', 'trialing', 'trial', 'legacy'])

export function isSubscriptionActive(status: string | null | undefined): boolean {
  return ACTIVE_STATUSES.has(status ?? 'legacy')
}
