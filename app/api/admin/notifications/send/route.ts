import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { sendAndLog, buildMessage, type NotificationType } from '@/lib/notifications'

export const dynamic = 'force-dynamic'

type IncomingType = 'reminder' | 'confirmed' | 'cancelled' | 'invoice'

const TYPE_MAP: Record<IncomingType, NotificationType> = {
  reminder:  'appointment_reminder',
  confirmed: 'appointment_confirmed',
  cancelled: 'appointment_cancelled',
  invoice:   'billing_invoice',
}

const TEMPLATES: Record<IncomingType, string> = {
  reminder:  'Halo {{nama}}, mengingatkan jadwal Anda di {{klinik}} besok {{tanggal}} pukul {{jam}} dengan dr. {{dokter}}. Harap hadir tepat waktu. Terima kasih.',
  confirmed: 'Halo {{nama}}, booking Anda di {{klinik}} telah dikonfirmasi untuk {{tanggal}} pukul {{jam}} dengan dr. {{dokter}}. No. antrian: {{nomor_antrian}}.',
  cancelled: 'Halo {{nama}}, mohon maaf janji temu Anda di {{klinik}} pada {{tanggal}} pukul {{jam}} telah dibatalkan. Silakan hubungi kami untuk penjadwalan ulang.',
  invoice:   'Halo {{nama}}, berikut ringkasan pembayaran Anda di {{klinik}}:\nNo. Invoice: {{invoice}}\nTotal: Rp {{total}}\nStatus: LUNAS ✅\nTerima kasih telah mempercayakan kesehatan Anda kepada kami.',
}

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    .format(new Date(iso))
}

function fmtTime(iso: string) {
  return new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false })
    .format(new Date(iso))
}

async function getClinicId() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const db = createAdminClient()
  const { data } = await db.from('users').select('clinic_id').eq('id', user.id).single()
  return data?.clinic_id ?? null
}

export async function POST(request: Request) {
  const clinicId = await getClinicId()
  if (!clinicId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as { type: IncomingType; appointmentId: string }
  const { type, appointmentId } = body

  if (!TYPE_MAP[type]) {
    return NextResponse.json({ error: 'Tipe notifikasi tidak valid' }, { status: 400 })
  }

  const db = createAdminClient()

  const { data: appt } = await db
    .from('appointments')
    .select(`
      id, scheduled_at, queue_number,
      patients ( full_name, phone ),
      doctors  ( full_name ),
      clinics  ( name, fonnte_token )
    `)
    .eq('id', appointmentId)
    .eq('clinic_id', clinicId)
    .single()

  if (!appt) return NextResponse.json({ error: 'Appointment tidak ditemukan' }, { status: 404 })

  const patient = appt.patients as { full_name: string; phone: string | null } | null
  const doctor  = appt.doctors  as { full_name: string } | null
  const clinic  = appt.clinics  as { name: string; fonnte_token: string | null } | null

  if (!clinic?.fonnte_token) {
    return NextResponse.json(
      { error: 'Fonnte token belum dikonfigurasi. Isi di Pengaturan → Notifikasi WhatsApp.' },
      { status: 400 },
    )
  }

  if (!patient?.phone) {
    return NextResponse.json({ error: 'Pasien tidak memiliki nomor HP' }, { status: 400 })
  }

  const vars: Record<string, string> = {
    nama:          patient.full_name,
    klinik:        clinic.name,
    tanggal:       fmtDate(appt.scheduled_at),
    jam:           fmtTime(appt.scheduled_at),
    dokter:        doctor?.full_name ?? '-',
    nomor_antrian: String(appt.queue_number ?? '-'),
    invoice:       '',
    total:         '',
  }

  const message = buildMessage(TEMPLATES[type], vars)

  const result = await sendAndLog(db, clinicId, {
    type:      TYPE_MAP[type],
    recipient: patient.phone,
    message,
    phone:     patient.phone,
    token:     clinic.fonnte_token,
  })

  return NextResponse.json(result, { status: result.success ? 200 : 500 })
}
