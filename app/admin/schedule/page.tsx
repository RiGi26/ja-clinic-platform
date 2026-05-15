import { getClinicUser } from '@/lib/clinic'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import ScheduleClient from './ScheduleClient'

export const dynamic = 'force-dynamic'

const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

export default async function SchedulePage() {
  const user = await getClinicUser()
  if (user.role !== 'admin') redirect('/auth/login')

  const db  = createAdminClient()
  const cid = user.clinic_id

  const [{ data: doctors }, { data: schedules }] = await Promise.all([
    db.from('doctors').select('id, full_name, specialty, is_active').eq('clinic_id', cid).order('full_name'),
    db.from('doctor_schedules')
      .select('id, doctor_id, day_of_week, start_time, end_time, max_patients, is_active')
      .eq('clinic_id', cid)
      .eq('is_active', true)
      .order('day_of_week'),
  ])

  const schedulesWithDay = (schedules ?? []).map(s => ({
    ...s,
    day_name: DAY_NAMES[s.day_of_week],
  }))

  return <ScheduleClient doctors={doctors ?? []} schedules={schedulesWithDay} clinicId={cid} />
}
