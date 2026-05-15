import { redirect } from 'next/navigation'
import { getClinicUser } from '@/lib/clinic'
import { createAdminClient } from '@/lib/supabase/server'
import PatientsClient from './PatientsClient'

export const dynamic = 'force-dynamic'

export default async function PatientsPage() {
  const user = await getClinicUser()
  if (user.role !== 'admin' && user.role !== 'receptionist') redirect('/auth/login')

  const db = createAdminClient()
  const { data: patients } = await db
    .from('patients')
    .select('id, no_rm, full_name, phone, gender, date_of_birth')
    .eq('clinic_id', user.clinic_id)
    .order('created_at', { ascending: false })

  return <PatientsClient patients={patients ?? []} />
}
