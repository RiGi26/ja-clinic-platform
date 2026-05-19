import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ReactNode } from 'react'
import ClinicSidebar from '@/components/ClinicSidebar'
import DemoBanner from '@/components/DemoBanner'
import ExpiredBanner from '@/components/ExpiredBanner'
import { isDemoSession } from '@/lib/is-demo-session'
import { getClinicPlanStatus } from '@/lib/plan-guard'

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
  const planStatus = await getClinicPlanStatus(admin.clinic_id)
  const showBanner = isDemo || planStatus.isExpired || (planStatus.isTrial && (planStatus.daysLeft ?? 99) <= 7)

  return (
    <div className="min-h-screen bg-[#F0F9FF]">
      <ClinicSidebar role="admin" userName={admin.full_name} userSub="Administrator" />
      <div className="clinic-content min-h-screen flex flex-col">
        <main className={`flex-1 p-6 lg:p-8 max-w-[1400px] w-full animate-fade-in-up${showBanner ? ' pb-14' : ''}`}>
          {children}
        </main>
      </div>
      {isDemo && <DemoBanner />}
      {!isDemo && (
        <ExpiredBanner
          plan={planStatus.plan}
          daysLeft={planStatus.daysLeft}
          isExpired={planStatus.isExpired}
          isTrial={planStatus.isTrial}
        />
      )}
    </div>
  )
}
