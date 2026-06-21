import { NextResponse } from 'next/server'
import { requireApiUser } from '@/lib/api-auth'
import { sendAndLog, buildMessage } from '@/lib/notifications'

export const dynamic = 'force-dynamic'

const REMINDER_TEMPLATE =
  'Halo {{nama}}, mengingatkan jadwal Anda di {{klinik}} besok {{tanggal}} pukul {{jam}} dengan dr. {{dokter}}. Harap hadir tepat waktu. Terima kasih.'

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    .format(new Date(iso))
}

function fmtTime(iso: string) {
  return new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false })
    .format(new Date(iso))
}

export async function POST() {
  const auth = await requireApiUser({ roles: ['admin', 'receptionist'] })
  if (!auth.ok) return auth.res
  const { db, clinicId } = auth

  const { data: clinic } = await db
    .from('clinics')
    .select('name, fonnte_token')
    .eq('id', clinicId)
    .single()

  if (!clinic?.fonnte_token) {
    return NextResponse.json(
      { error: 'Fonnte token belum dikonfigurasi' },
      { status: 400 },
    )
  }

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const start = new Date(tomorrow)
  start.setHours(0, 0, 0, 0)
  const end = new Date(tomorrow)
  end.setHours(23, 59, 59, 999)

  const { data: appointments } = await db
    .from('appointments')
    .select(`
      id, scheduled_at, queue_number,
      patients ( full_name, phone ),
      doctors  ( full_name )
    `)
    .eq('clinic_id', clinicId)
    .eq('status', 'menunggu')
    .gte('scheduled_at', start.toISOString())
    .lte('scheduled_at', end.toISOString())

  if (!appointments?.length) {
    return NextResponse.json({ sent: 0, failed: 0, errors: [], message: 'Tidak ada appointment besok' })
  }

  let sent = 0
  let failed = 0
  const errors: string[] = []

  for (const appt of appointments) {
    const patient = appt.patients as unknown as { full_name: string; phone: string | null } | null
    const doctor  = appt.doctors  as unknown as { full_name: string } | null

    if (!patient?.phone) {
      errors.push(`Appointment ${appt.id}: pasien tidak memiliki nomor HP`)
      failed++
      continue
    }

    const message = buildMessage(REMINDER_TEMPLATE, {
      nama:    patient.full_name,
      klinik:  clinic.name,
      tanggal: fmtDate(appt.scheduled_at),
      jam:     fmtTime(appt.scheduled_at),
      dokter:  doctor?.full_name ?? '-',
    })

    const result = await sendAndLog(db, clinicId, {
      type:      'appointment_reminder',
      recipient: patient.phone,
      message,
      phone:     patient.phone,
      token:     clinic.fonnte_token,
    })

    if (result.success) {
      sent++
    } else {
      failed++
      errors.push(`${patient.full_name}: ${result.error ?? 'unknown error'}`)
    }
  }

  return NextResponse.json({ sent, failed, errors })
}
