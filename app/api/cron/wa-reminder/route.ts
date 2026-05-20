import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { sendAndLog } from '@/lib/notifications'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const authHeader = request.headers.get('Authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = createAdminClient()

  const { data: clinics, error } = await db
    .from('clinics')
    .select('id, name, fonnte_token')
    .eq('is_active', true)
    .not('plan', 'in', '(suspended)')
    .not('fonnte_token', 'is', null)
    .neq('fonnte_token', '')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]

  let totalSent   = 0
  let totalFailed = 0
  const errors: string[] = []

  const results = await Promise.allSettled(
    (clinics ?? []).map(async (clinic) => {
      const { data: appointments } = await db
        .from('appointments')
        .select('id, scheduled_at, queue_number, patients(full_name, phone), doctors(full_name)')
        .eq('clinic_id', clinic.id)
        .eq('status', 'menunggu')
        .gte('scheduled_at', tomorrowStr + 'T00:00:00')
        .lt('scheduled_at', tomorrowStr + 'T23:59:59')
        .order('scheduled_at')

      let sent = 0, failed = 0
      for (const apt of appointments ?? []) {
        const patient = apt.patients as any
        const doctor  = apt.doctors  as any
        if (!patient?.phone) continue

        const tanggal = new Intl.DateTimeFormat('id-ID', {
          weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        }).format(new Date(apt.scheduled_at))
        const jam = new Intl.DateTimeFormat('id-ID', {
          hour: '2-digit', minute: '2-digit',
        }).format(new Date(apt.scheduled_at))

        const message =
          `Halo ${patient.full_name}, mengingatkan jadwal Anda di ${clinic.name} ` +
          `besok ${tanggal} pukul ${jam} dengan ${doctor?.full_name ?? 'dokter'}. ` +
          `No. antrian: ${apt.queue_number ?? '-'}. ` +
          `Harap hadir 10 menit sebelum jadwal. Terima kasih.`

        const result = await sendAndLog(db, clinic.id, {
          type:      'appointment_reminder',
          recipient: patient.phone,
          message,
          phone:     patient.phone,
          token:     clinic.fonnte_token,
        })

        if (result.success) sent++
        else { failed++; if (result.error) errors.push(`${clinic.name}: ${result.error}`) }
      }
      return { sent, failed }
    })
  )

  results.forEach(r => {
    if (r.status === 'fulfilled') { totalSent += r.value.sent; totalFailed += r.value.failed }
    else errors.push(String(r.reason))
  })

  console.log(`[cron/wa-reminder] clinics=${(clinics ?? []).length} sent=${totalSent} failed=${totalFailed}`)

  return NextResponse.json({
    clinics_processed: (clinics ?? []).length,
    total_sent:   totalSent,
    total_failed: totalFailed,
    errors,
  })
}
