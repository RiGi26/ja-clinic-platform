import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ReactNode, Suspense } from 'react'
import DemoBanner from '@/components/DemoBanner'
import ExpiredBanner from '@/components/ExpiredBanner'
import UpsellBanner from '@/components/UpsellBanner'
import { isDemoSession } from '@/lib/is-demo-session'
import { getClinicPlanStatus } from '@/lib/plan-guard'
import { getClinicEntitlements } from '@/lib/clinic-entitlements'
import ClinicClientLayout from '@/components/ClinicClientLayout'
import { OnboardingLauncher } from '@/components/onboarding/OnboardingLauncher'
import { PageCoachmark } from '@/components/onboarding/PageCoachmark'
import { getOnboardingState, getSeenCoachmarks } from '@/lib/onboarding/state'
import { firstPendingAnnouncement } from '@/lib/onboarding/coachmarks'

export const dynamic = 'force-dynamic'

async function getAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const db = createAdminClient()
  const { data: profile } = await db
    .from('users')
    .select('id, full_name, role, status, clinic_id')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin' || profile.status !== 'active') {
    redirect('/auth/login')
  }
  return profile
}

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const admin  = await getAdmin()
  const isDemo = await isDemoSession()
  const [planStatus, ent, onboarding] = await Promise.all([
    getClinicPlanStatus(admin.clinic_id),
    getClinicEntitlements(admin.clinic_id),
    // Shares one computation with the dashboard page via React cache().
    getOnboardingState(),
  ])

  // Feature announcements: only for users past first-run onboarding, so we don't
  // pile a "what's new" on top of the welcome/tour a brand-new user is still doing.
  const announcement =
    !onboarding.showWelcome && !onboarding.showTour
      ? firstPendingAnnouncement(ent.entitlements, await getSeenCoachmarks())
      : null

  return (
    <div className="h-screen flex overflow-hidden bg-bg text-text">
      {isDemo && <DemoBanner />}
      {!isDemo && (
        <ExpiredBanner
          plan={planStatus.plan}
          daysLeft={planStatus.daysLeft}
          isExpired={planStatus.isExpired}
          isTrial={planStatus.isTrial}
        />
      )}
      <Suspense fallback={null}>
        <UpsellBanner />
      </Suspense>

      <ClinicClientLayout
        role="admin"
        userName={admin.full_name}
        userSub="Administrator"
        entitlements={ent.entitlements}
      >
        {children}
        {/* Always mounted so the "?" help button can replay the tour even after
            onboarding is done; welcome only opens when showWelcome, driver.js stays lazy. */}
        <OnboardingLauncher
          showWelcome={onboarding.showWelcome}
          showTour={onboarding.showTour}
          track={onboarding.track}
          userName={admin.full_name}
        />
        {announcement && (
          <PageCoachmark
            coachKey={announcement.key}
            target={announcement.selector}
            title={announcement.title}
            description={announcement.description}
            seen={false}
          />
        )}
      </ClinicClientLayout>
    </div>
  )
}
