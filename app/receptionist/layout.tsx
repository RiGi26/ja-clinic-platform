import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ReactNode } from 'react'
import ClinicClientLayout from '@/components/ClinicClientLayout'

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
    <div className="h-screen flex overflow-hidden bg-bg text-text">
      <ClinicClientLayout
        role="receptionist"
        userName={user.full_name}
        userSub="Resepsionis"
      >
        {children}
      </ClinicClientLayout>
    </div>
  )
}
