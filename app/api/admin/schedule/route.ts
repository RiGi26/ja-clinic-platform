import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

async function getClinicId() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const db = createAdminClient()
  const { data } = await db.from('users').select('clinic_id').eq('id', user.id).single()
  return data?.clinic_id ?? null
}

export async function GET() {
  const clinicId = await getClinicId()
  if (!clinicId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createAdminClient()

  const [{ data: doctors }, { data: schedules }] = await Promise.all([
    db.from('doctors')
      .select('id, full_name, specialty, is_active, consultation_fee')
      .eq('clinic_id', clinicId)
      .eq('is_active', true)
      .order('full_name'),
    db.from('doctor_schedules')
      .select('id, doctor_id, day_of_week, start_time, end_time, max_patients, is_active')
      .eq('clinic_id', clinicId)
      .eq('is_active', true)
      .order('day_of_week'),
  ])

  const schedulesWithDay = (schedules ?? []).map(s => ({
    ...s,
    day_name: DAY_NAMES[s.day_of_week],
  }))

  return NextResponse.json({ doctors: doctors ?? [], schedules: schedulesWithDay })
}

export async function POST(request: Request) {
  const clinicId = await getClinicId()
  if (!clinicId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { doctor_id, day_of_week, start_time, end_time, max_patients } = body

  if (!doctor_id || day_of_week == null || !start_time || !end_time) {
    return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 })
  }

  const db = createAdminClient()
  const { error } = await db.from('doctor_schedules').insert({
    clinic_id: clinicId,
    doctor_id,
    day_of_week,
    start_time,
    end_time,
    max_patients: max_patients ?? 10,
    is_active: true,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(request: Request) {
  const clinicId = await getClinicId()
  if (!clinicId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await request.json()
  if (!id) return NextResponse.json({ error: 'id wajib' }, { status: 400 })

  const db = createAdminClient()
  const { error } = await db.from('doctor_schedules').delete()
    .eq('id', id).eq('clinic_id', clinicId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
