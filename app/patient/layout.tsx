import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ReactNode } from 'react'
import ClinicClientLayout from '@/components/ClinicClientLayout'

export const dynamic = 'force-dynamic'

async function getPatient() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const db = createAdminClient()
  const { data: profile } = await db
    .from('users')
    .select('id, full_name, role, status')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'patient' || profile.status !== 'active') redirect('/auth/login')
  return profile
}

export default async function PatientLayout({ children }: { children: ReactNode }) {
  const patient = await getPatient()

  return (
    <div className="h-screen flex overflow-hidden bg-bg text-text">
      <ClinicClientLayout 
        role="patient" 
        userName={patient.full_name} 
        userSub="Pasien"
      >
        {children}
      </ClinicClientLayout>
    </div>
  )
}
