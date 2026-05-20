import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ReactNode } from 'react'
import DemoBanner from '@/components/DemoBanner'
import ExpiredBanner from '@/components/ExpiredBanner'
import { isDemoSession } from '@/lib/is-demo-session'
import { getClinicPlanStatus } from '@/lib/plan-guard'
import ClinicClientLayout from '@/components/ClinicClientLayout'

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
      
      <ClinicClientLayout 
        role="admin" 
        userName={admin.full_name} 
        userSub="Administrator"
      >
        {children}
      </ClinicClientLayout>
    </div>
  )
}
