import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ReactNode } from 'react'
import ReceptionistSidebar from '@/components/ReceptionistSidebar'

export const dynamic = 'force-dynamic'

async function getReceptionist() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const db = createAdminClient()
  const { data: profile } = await db
    .from('users')
    .select('id, full_name, role, status, clinic_id')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'receptionist' || profile.status !== 'active') {
    redirect('/auth/login')
  }
  return profile
}

export default async function ReceptionistLayout({ children }: { children: ReactNode }) {
  const user = await getReceptionist()

  return (
    <div className="min-h-screen bg-background">
      <ReceptionistSidebar userName={user.full_name} />
      <div className="clinic-content min-h-screen flex flex-col">
        <main className="flex-1 p-6 lg:p-8 max-w-[1400px] w-full animate-fade-in-up">
          {children}
        </main>
      </div>
    </div>
  )
}
