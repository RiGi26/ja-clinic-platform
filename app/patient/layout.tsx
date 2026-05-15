import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ReactNode } from 'react'
import ClinicSidebar from '@/components/ClinicSidebar'

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
    <div className="min-h-screen bg-[#F0F9FF]">
      <ClinicSidebar role="patient" userName={patient.full_name} userSub="Pasien" />
      <div className="clinic-content min-h-screen flex flex-col">
        <main className="flex-1 p-6 lg:p-8 max-w-[1200px] w-full animate-fade-in-up">
          {children}
        </main>
      </div>
    </div>
  )
}
