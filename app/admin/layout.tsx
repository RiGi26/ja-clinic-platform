import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ReactNode } from 'react'
import ClinicSidebar from '@/components/ClinicSidebar'

export const dynamic = 'force-dynamic'

async function getAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const db = createAdminClient()
  const { data: profile } = await db
    .from('users')
    .select('id, full_name, role, status')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin' || profile.status !== 'active') {
    redirect('/auth/login')
  }
  return profile
}

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const admin = await getAdmin()

  return (
    <div className="min-h-screen bg-[#F0F9FF]">
      <ClinicSidebar role="admin" userName={admin.full_name} userSub="Administrator" />
      <div className="clinic-content min-h-screen flex flex-col">
        <main className="flex-1 p-6 lg:p-8 max-w-[1400px] w-full animate-fade-in-up">
          {children}
        </main>
      </div>
    </div>
  )
}
