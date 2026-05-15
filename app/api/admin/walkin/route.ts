import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createAdminClient()
  const { data: profile } = await db.from('users').select('clinic_id').eq('id', user.id).single()
  if (!profile?.clinic_id) return NextResponse.json({ error: 'Clinic not found' }, { status: 400 })

  const { full_name, phone, gender, date_of_birth, doctor_id, complaint, time } = await request.json()
  const clinicId = profile.clinic_id

  // Generate No. RM
  const yr  = new Date().getFullYear()
  const { count } = await db.from('patients').select('*', { count:'exact', head:true }).eq('clinic_id', clinicId)
  const no_rm = `RM-${yr}-${String((count ?? 0) + 1).padStart(4, '0')}`

  // Buat patient
  const { data: patient, error: patErr } = await db.from('patients').insert({
    clinic_id: clinicId, no_rm, full_name,
    phone: phone || null, gender: gender || null,
    date_of_birth: date_of_birth || null,
  }).select('id').single()

  if (patErr || !patient) return NextResponse.json({ error: patErr?.message }, { status: 500 })

  // Buat appointment walk-in
  const today     = new Date()
  const [h, m]    = (time || '08:00').split(':').map(Number)
  const scheduled = new Date(today.getFullYear(), today.getMonth(), today.getDate(), h, m)

  const { count: queueCount } = await db.from('appointments')
    .select('*', { count:'exact', head:true })
    .eq('clinic_id', clinicId)
    .eq('doctor_id', doctor_id)
    .gte('scheduled_at', new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString())

  await db.from('appointments').insert({
    clinic_id: clinicId, patient_id: patient.id, doctor_id,
    scheduled_at: scheduled.toISOString(),
    complaint: complaint || null,
    status: 'menunggu', type: 'walkin',
    queue_number: (queueCount ?? 0) + 1,
  })

  return NextResponse.json({ success: true, no_rm, queue: (queueCount ?? 0) + 1 })
}
