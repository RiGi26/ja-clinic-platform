import type { EntitlementKey } from '@/lib/entitlements'
import type { createAdminClient } from '@/lib/supabase/server'

// ============================================================
// Onboarding "Misi Pertama" — step catalogue (SSOT). Ported from ja-stock-platform
// (ONBOARDING_PLAYBOOK.md), specialised for the clinic domain.
// Only the admin persona gets onboarding (doctor/receptionist live in their own
// portal areas), so there is a single meaningful track: 'owner' (= role admin).
// All steps are derived from real data so the checklist can never lie.
// Steps are further filtered by clinic entitlements at read time (see state.ts).
// ============================================================

type DB = ReturnType<typeof createAdminClient>

export type OnboardingTrack = 'owner' | 'operator'

export interface StepDef {
  key: string
  title: string
  desc: string
  ctaLabel: string
  href: string
  /** Only show this step when the clinic holds this entitlement (omit = always). */
  feature?: EntitlementKey
  /** Derived completion check against real data (clinic-level). */
  resolver?: (db: DB, clinicId: string) => Promise<boolean>
}

// ---- derived resolvers (real data, clinic-scoped; reads via service client) ----

async function hasLocation(db: DB, clinicId: string): Promise<boolean> {
  const { count } = await db
    .from('locations')
    .select('id', { count: 'exact', head: true })
    .eq('clinic_id', clinicId)
    .eq('is_active', true)
  return (count ?? 0) > 0
}

async function hasDoctor(db: DB, clinicId: string): Promise<boolean> {
  const { count } = await db
    .from('doctors')
    .select('id', { count: 'exact', head: true })
    .eq('clinic_id', clinicId)
    .eq('is_active', true)
  return (count ?? 0) > 0
}

async function hasTreatment(db: DB, clinicId: string): Promise<boolean> {
  const { count } = await db
    .from('treatments')
    .select('id', { count: 'exact', head: true })
    .eq('clinic_id', clinicId)
    .eq('is_active', true)
  return (count ?? 0) > 0
}

async function hasAppointment(db: DB, clinicId: string): Promise<boolean> {
  const { count } = await db
    .from('appointments')
    .select('id', { count: 'exact', head: true })
    .eq('clinic_id', clinicId)
  return (count ?? 0) > 0
}

// ---- step catalogues per track ----

const OWNER_STEPS: StepDef[] = [
  {
    key: 'add_location',
    title: 'Tambah cabang pertama',
    desc: 'Daftarkan minimal satu cabang/lokasi praktik sebagai tempat layanan.',
    ctaLabel: 'Kelola cabang',
    href: '/admin/locations',
    resolver: hasLocation,
  },
  {
    key: 'add_doctor',
    title: 'Lengkapi daftar dokter',
    desc: 'Tambahkan dokter atau terapis yang praktik di klinikmu.',
    ctaLabel: 'Buka pengaturan',
    href: '/admin/settings',
    resolver: hasDoctor,
  },
  {
    key: 'add_treatment',
    title: 'Susun tindakan & tarif',
    desc: 'Isi daftar tindakan beserta tarifnya agar billing rapi sejak awal.',
    ctaLabel: 'Atur tindakan',
    href: '/admin/treatments',
    resolver: hasTreatment,
  },
  {
    key: 'first_appointment',
    title: 'Catat kunjungan pertama',
    desc: 'Daftarkan satu pasien (walk-in) untuk menuntaskan penyiapan.',
    ctaLabel: 'Daftarkan pasien',
    href: '/admin/appointments/walkin',
    feature: 'appointments',
    resolver: hasAppointment,
  },
]

export const STEPS_BY_TRACK: Record<OnboardingTrack, StepDef[]> = {
  owner: OWNER_STEPS,
  operator: [], // doctor/receptionist have their own portal areas; no checklist there
}

/** Map a portal role to an onboarding track. Only admin gets the owner checklist. */
export function trackForRole(role: string): OnboardingTrack {
  return role === 'admin' ? 'owner' : 'operator'
}
