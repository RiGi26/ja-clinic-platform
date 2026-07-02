import { cache } from 'react'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getClinicEntitlements } from '@/lib/clinic-entitlements'
import { isDemoSession } from '@/lib/is-demo-session'
import { STEPS_BY_TRACK, trackForRole, type OnboardingTrack } from './steps'

// ============================================================
// Onboarding state — computed server-side on admin-area load. Derived steps run
// their real-data resolvers in parallel. Wrapped in React cache() so the admin
// layout (launcher flags) and the dashboard page (full checklist) share one
// computation per request. Reads follow the clinic convention: service-role
// client + explicit user/clinic filters.
// ============================================================

export interface ChecklistItem {
  key: string
  title: string
  desc: string
  ctaLabel: string
  href: string
  done: boolean
  /** true = completion is marked by the user (not derived from data) */
  manual: boolean
}

export interface OnboardingState {
  role: string
  track: OnboardingTrack
  userName: string
  items: ChecklistItem[]
  total: number
  completed: number
  progress: number // 0..100
  allDone: boolean
  checklistVisible: boolean
  showWelcome: boolean
  showTour: boolean
}

/** Signed-in user + clinic context for onboarding (one query set per request). */
const getOnboardingContext = cache(async () => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const db = createAdminClient()
  const { data: profile } = await db
    .from('users')
    .select('id, full_name, role, clinic_id, status')
    .eq('id', user.id)
    .single()
  if (!profile || profile.status !== 'active' || !profile.clinic_id) return null

  const [{ data: clinic }, ent, demoSession] = await Promise.all([
    db.from('clinics').select('slug').eq('id', profile.clinic_id).single(),
    getClinicEntitlements(profile.clinic_id),
    isDemoSession(),
  ])

  const slug = (clinic?.slug as string | undefined) ?? ''
  return {
    db,
    userId: user.id,
    clinicId: profile.clinic_id as string,
    role: profile.role as string,
    userName: (profile.full_name as string) ?? '',
    // Demo/pitch clinics carry pre-seeded data — a "misi pertama" checklist there
    // reads as ~done and confuses prospects (e.g. demo-clinic, kamy-physio-demo).
    isDemo: demoSession || slug === 'demo-clinic' || slug.endsWith('-demo'),
    entitlements: ent.entitlements as string[],
  }
})

const EMPTY: OnboardingState = {
  role: '',
  track: 'operator',
  userName: '',
  items: [],
  total: 0,
  completed: 0,
  progress: 0,
  allDone: false,
  checklistVisible: false,
  showWelcome: false,
  showTour: false,
}

/** Keys of feature announcements this user has already seen. */
export const getSeenCoachmarks = cache(async (): Promise<string[]> => {
  const ctx = await getOnboardingContext()
  if (!ctx) return []
  const { data } = await ctx.db
    .from('user_onboarding')
    .select('seen_coachmarks')
    .eq('user_id', ctx.userId)
    .maybeSingle()
  return Array.isArray(data?.seen_coachmarks) ? (data!.seen_coachmarks as string[]) : []
})

export const getOnboardingState = cache(async (): Promise<OnboardingState> => {
  const ctx = await getOnboardingContext()
  if (!ctx) return EMPTY

  const track = trackForRole(ctx.role)
  const defs = STEPS_BY_TRACK[track].filter(
    (s) => !s.feature || ctx.entitlements.includes(s.feature)
  )

  const { data: row } = await ctx.db
    .from('user_onboarding')
    .select('completed_steps, welcome_dismissed_at, tour_completed_at, checklist_dismissed_at')
    .eq('user_id', ctx.userId)
    .maybeSingle()

  const showWelcome = !row?.welcome_dismissed_at
  const showTour = !row?.tour_completed_at
  const checklistDismissed = !!row?.checklist_dismissed_at

  // Skip the checklist entirely for demo clinics, after dismissal, or when no
  // steps apply — and avoid the per-load resolver queries in those cases.
  if (ctx.isDemo || checklistDismissed || defs.length === 0) {
    return {
      ...EMPTY,
      role: ctx.role,
      track,
      userName: ctx.userName,
      showWelcome,
      showTour,
    }
  }

  const completedManual: string[] = Array.isArray(row?.completed_steps)
    ? (row!.completed_steps as string[])
    : []

  // Derived resolvers are independent → run in parallel.
  const resolved = await Promise.all(
    defs.map((d) => (d.resolver ? d.resolver(ctx.db, ctx.clinicId) : Promise.resolve<boolean | null>(null)))
  )

  const items: ChecklistItem[] = defs.map((d, i) => {
    const manual = !d.resolver
    const done = manual ? completedManual.includes(d.key) : !!resolved[i]
    return { key: d.key, title: d.title, desc: d.desc, ctaLabel: d.ctaLabel, href: d.href, done, manual }
  })

  const total = items.length
  const completed = items.filter((i) => i.done).length
  const allDone = total > 0 && completed === total

  return {
    role: ctx.role,
    track,
    userName: ctx.userName,
    items,
    total,
    completed,
    progress: total ? Math.round((completed / total) * 100) : 0,
    allDone,
    checklistVisible: !allDone,
    showWelcome,
    showTour,
  }
})
