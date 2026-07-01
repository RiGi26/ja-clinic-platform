import { getClinicUser } from '@/lib/clinic'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import AppointmentsClient from './AppointmentsClient'

export const dynamic = 'force-dynamic'

export default async function AppointmentsPage() {
  const user = await getClinicUser()
  if (user.role !== 'admin' && user.role !== 'receptionist') redirect('/auth/login')

  const db = createAdminClient()
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const todayEnd   = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString()

  const [{ data }, { data: branches }] = await Promise.all([
    db
      .from('appointments')
      .select(`
        id, scheduled_at, status, complaint, type, queue_number, location_id,
        patients(id, no_rm, full_name, phone, gender),
        doctors(id, full_name, specialty),
        locations(id, name)
      `)
      .eq('clinic_id', user.clinic_id)
      .gte('scheduled_at', todayStart)
      .lt('scheduled_at', todayEnd)
      .order('queue_number', { ascending: true, nullsFirst: false })
      .order('scheduled_at', { ascending: true }),
    db
      .from('locations')
      .select('id, name')
      .eq('clinic_id', user.clinic_id)
      .eq('is_active', true)
      .order('created_at', { ascending: true }),
  ])

  return <AppointmentsClient initial={(data ?? []) as any} branches={(branches ?? []) as any} />
}
