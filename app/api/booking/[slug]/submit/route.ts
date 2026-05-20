import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { sendAndLog } from '@/lib/notifications'

export const dynamic = 'force-dynamic'

function genBookingCode(date: string): string {
  const d = date.replace(/-/g, '')
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return `BK-${d}-${code}`
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug }  = await params
  const body      = await request.json() as {
    doctor_id: string; date: string; time: string
    no_hp: string; nama_lengkap: string; tanggal_lahir?: string
    jenis_kelamin?: string; keluhan: string
  }

  if (!body.doctor_id || !body.date || !body.time || !body.no_hp || !body.nama_lengkap || !body.keluhan) {
    return NextResponse.json({ error: 'Field wajib tidak lengkap' }, { status: 400 })
  }

  const db = createAdminClient()

  const { data: link } = await db
    .from('booking_links')
    .select('clinic_id, is_active, clinics(name, address, phone, fonnte_token)')
    .eq('slug', slug)
    .single()

  if (!link?.is_active) return NextResponse.json({ error: 'Link tidak aktif' }, { status: 404 })

  const clinic   = link.clinics as any
  const clinicId = link.clinic_id

  // Build scheduled_at from date + time
  const [yr, mo, dy] = body.date.split('-').map(Number)
  const [h, m]       = body.time.split(':').map(Number)
  const scheduledAt  = new Date(yr, mo - 1, dy, h, m).toISOString()

  // Re-check slot availability (guard against race condition)
  const { count } = await db
    .from('appointments')
    .select('*', { count: 'exact', head: true })
    .eq('clinic_id', clinicId)
    .eq('doctor_id', body.doctor_id)
    .eq('scheduled_at', scheduledAt)
    .neq('status', 'batal')

  if ((count ?? 0) > 0) {
    return NextResponse.json({ error: 'Slot sudah tidak tersedia, pilih jam lain' }, { status: 409 })
  }

  // Find or create patient
  const { data: existing } = await db
    .from('patients')
    .select('id, full_name')
    .eq('clinic_id', clinicId)
    .eq('phone', body.no_hp)
    .single()

  let patientId: string
  let patientName: string

  if (existing) {
    patientId   = existing.id
    patientName = existing.full_name
  } else {
    const { count: patCount } = await db.from('patients').select('*', { count: 'exact', head: true }).eq('clinic_id', clinicId)
    const no_rm = `RM-${yr}-${String((patCount ?? 0) + 1).padStart(4, '0')}`

    const { data: newPat, error: patErr } = await db.from('patients').insert({
      clinic_id:     clinicId,
      no_rm,
      full_name:     body.nama_lengkap,
      phone:         body.no_hp,
      date_of_birth: body.tanggal_lahir || null,
      gender:        body.jenis_kelamin || null,
    }).select('id, full_name').single()

    if (patErr || !newPat) return NextResponse.json({ error: 'Gagal membuat data pasien' }, { status: 500 })
    patientId   = newPat.id
    patientName = newPat.full_name
  }

  const { data: doctor } = await db.from('doctors').select('full_name').eq('id', body.doctor_id).single()

  const bookingCode = genBookingCode(body.date)

  const { error: aptErr } = await db.from('appointments').insert({
    clinic_id:    clinicId,
    patient_id:   patientId,
    doctor_id:    body.doctor_id,
    scheduled_at: scheduledAt,
    complaint:    body.keluhan,
    status:       'menunggu',
    type:         'booking',
    source:       'self_booking',
    booking_code: bookingCode,
  })

  if (aptErr) return NextResponse.json({ error: aptErr.message }, { status: 500 })

  // WA notifications (non-blocking)
  if (clinic.fonnte_token) {
    const tanggal = new Intl.DateTimeFormat('id-ID', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    }).format(new Date(body.date + 'T00:00:00'))

    const patMsg =
      `Halo ${patientName}, booking Anda di ${clinic.name} berhasil!\n\n` +
      `Kode Booking: *${bookingCode}*\n` +
      `Dokter: dr. ${doctor?.full_name ?? '-'}\n` +
      `Tanggal: ${tanggal}\n` +
      `Jam: ${body.time} WIB\n\n` +
      `Tunjukkan kode ini kepada receptionist saat tiba. Harap hadir 10 menit sebelum jadwal.\n` +
      `Terima kasih — ${clinic.name}`

    sendAndLog(db, clinicId, {
      type: 'appointment_confirmed', recipient: body.no_hp,
      message: patMsg, phone: body.no_hp, token: clinic.fonnte_token,
    }).catch(console.error)

    if (clinic.phone) {
      const adminMsg =
        `📅 *Booking Baru Masuk*\n\n` +
        `Pasien: ${patientName} (${body.no_hp})\n` +
        `Dokter: dr. ${doctor?.full_name ?? '-'}\n` +
        `Tanggal: ${tanggal} — Jam: ${body.time}\n` +
        `Keluhan: ${body.keluhan}\n` +
        `Kode: ${bookingCode}`

      sendAndLog(db, clinicId, {
        type: 'appointment_confirmed', recipient: clinic.phone,
        message: adminMsg, phone: clinic.phone, token: clinic.fonnte_token,
      }).catch(console.error)
    }
  }

  return NextResponse.json({
    booking_code:  bookingCode,
    doctor_name:   doctor?.full_name ?? '-',
    date:          body.date,
    time:          body.time,
    patient_name:  patientName,
    clinic_name:   clinic.name,
  })
}
