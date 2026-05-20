import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ReactNode } from 'react'
import ClinicClientLayout from '@/components/ClinicClientLayout'

export const dynamic = 'force-dynamic'

async function getDoctor() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const db = createAdminClient()
  const { data: profile } = await db
    .from('users')
    .select('id, full_name, role, status')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'doctor' || profile.status !== 'active') redirect('/auth/login')

  const { data: doctor } = await db
    .from('doctors')
    .select('specialty')
    .eq('user_id', user.id)
    .single()

  return { ...profile, specialty: doctor?.specialty ?? 'Dokter' }
}

export default async function DoctorLayout({ children }: { children: ReactNode }) {
  const doctor = await getDoctor()

  return (
    <div className="h-screen flex overflow-hidden bg-bg text-text">
      <ClinicClientLayout 
        role="doctor" 
        userName={doctor.full_name} 
        userSub={doctor.specialty}
      >
        {children}
      </ClinicClientLayout>
    </div>
  )
}
