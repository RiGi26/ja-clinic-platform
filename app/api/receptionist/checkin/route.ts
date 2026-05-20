import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { sendAndLog } from '@/lib/notifications'

export const dynamic = 'force-dynamic'

async function getClinicId() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const db = createAdminClient()
  const { data } = await db.from('users').select('clinic_id, role').eq('id', user.id).single()
  if (!data?.clinic_id || !['admin', 'receptionist'].includes(data.role)) return null
  return data.clinic_id as string
}

export async function GET(request: Request) {
  const clinicId = await getClinicId()
  if (!clinicId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const source = searchParams.get('source')

  const now   = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const end   = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString()

  const db = createAdminClient()
  let q = db.from('appointments')
    .select(`
      id, scheduled_at, status, complaint, type, queue_number, source, booking_code,
      patients(id, full_name, no_rm, phone),
      doctors(id, full_name, specialty)
    `)
    .eq('clinic_id', clinicId)
    .gte('scheduled_at', start)
    .lt('scheduled_at', end)
    .neq('status', 'batal')
    .order('queue_number', { ascending: true, nullsFirst: false })
    .order('scheduled_at', { ascending: true })

  if (source) q = q.eq('source', source)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ appointments: data ?? [] })
}

export async function POST(request: Request) {
  const clinicId = await getClinicId()
  if (!clinicId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { appointment_id } = await request.json() as { appointment_id: string }
  if (!appointment_id) return NextResponse.json({ error: 'appointment_id wajib' }, { status: 400 })

  const db = createAdminClient()
  const { data: apt } = await db
    .from('appointments')
    .select('id, queue_number, doctor_id, patient_id, complaint, status')
    .eq('id', appointment_id)
    .eq('clinic_id', clinicId)
    .single()

  if (!apt) return NextResponse.json({ error: 'Appointment tidak ditemukan' }, { status: 404 })

  let queueNumber = apt.queue_number
  if (!queueNumber) {
    const now   = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    const { count } = await db.from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('clinic_id', clinicId)
      .eq('doctor_id', apt.doctor_id)
      .gte('scheduled_at', start)
      .neq('status', 'batal')

    queueNumber = (count ?? 0) + 1
    await db.from('appointments').update({ queue_number: queueNumber }).eq('id', appointment_id)
  }

  // WA notif ke dokter — non-blocking, tidak boleh block response
  Promise.allSettled([
    (async () => {
      if (!apt.doctor_id) return

      // Ambil user_id dokter dari table doctors
      const { data: doctorRec } = await db
        .from('doctors')
        .select('user_id, full_name')
        .eq('id', apt.doctor_id)
        .single()

      if (!doctorRec?.user_id) return

      // Ambil no HP dokter dari table users
      const { data: doctorUser } = await db
        .from('users')
        .select('phone')
        .eq('id', doctorRec.user_id)
        .single()

      if (!doctorUser?.phone) return

      // Ambil nama pasien
      const { data: patient } = await db
        .from('patients')
        .select('full_name')
        .eq('id', apt.patient_id)
        .single()

      // Ambil nama klinik + fonnte token
      const { data: clinic } = await db
        .from('clinics')
        .select('name, fonnte_token')
        .eq('id', clinicId)
        .single()

      if (!clinic?.fonnte_token) return

      const msg =
        `🏥 ${clinic.name}\n` +
        `Pasien *${patient?.full_name ?? 'Pasien'}* sudah hadir.\n` +
        `Nomor antrian: *${queueNumber}*\n` +
        `Keluhan: ${apt.complaint ?? '-'}\n\n` +
        `Silakan bersiap.`

      await sendAndLog(db, clinicId, {
        type     : 'general',
        recipient: doctorRec.full_name ?? doctorUser.phone,
        message  : msg,
        phone    : doctorUser.phone,
        token    : clinic.fonnte_token,
      })
    })(),
  ]).catch(err => console.error('[checkin] WA doctor error:', err))

  return NextResponse.json({ success: true, queue_number: queueNumber })
}
