import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getClinicPlanStatus } from '@/lib/plan-guard'
import { belongsToClinic } from '@/lib/api-auth'
import { sendEmail } from '@/lib/email'
import React from 'react'
import AppointmentConfirmed from '@/emails/AppointmentConfirmed'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createAdminClient()
  const { data: profile } = await db.from('users').select('clinic_id').eq('id', user.id).single()
  if (!profile?.clinic_id) return NextResponse.json({ error: 'Clinic not found' }, { status: 400 })

  const { isBlocked } = await getClinicPlanStatus(profile.clinic_id)
  if (isBlocked) {
    return NextResponse.json(
      { error: 'Masa aktif klinik telah berakhir atau ditangguhkan. Hubungi tim kami.' },
      { status: 403 }
    )
  }

  const { full_name, phone, gender, date_of_birth, doctor_id, complaint, time, email, jenis_kunjungan, no_bpjs } = await request.json()
  const clinicId = profile.clinic_id

  // Cross-tenant guard: doctor must belong to this clinic
  if (!(await belongsToClinic(db, 'doctors', doctor_id, clinicId))) {
    return NextResponse.json({ error: 'Dokter tidak ditemukan' }, { status: 404 })
  }

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

  if (no_bpjs) {
    await db.from('patients').update({
      no_bpjs,
      jenis_penjamin: jenis_kunjungan ?? 'umum',
    }).eq('id', patient.id)
  }

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
    jenis_kunjungan: jenis_kunjungan ?? 'umum',
  })

  if (email) {
    const queueNumber = (queueCount ?? 0) + 1
    Promise.all([
      db.from('doctors').select('full_name').eq('id', doctor_id).single(),
      db.from('clinics').select('name, address').eq('id', clinicId).single(),
    ]).then(([{ data: doctor }, { data: clinic }]) => {
      if (!doctor || !clinic) return
      const scheduledAt = new Intl.DateTimeFormat('id-ID', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      }).format(scheduled)
      return sendEmail({
        to: email,
        subject: `Konfirmasi Antrian — ${clinic.name}`,
        react: React.createElement(AppointmentConfirmed, {
          patientName: full_name,
          clinicName: clinic.name,
          doctorName: doctor.full_name,
          scheduledAt,
          queueNumber,
          clinicAddress: clinic.address ?? null,
          loginUrl: `${process.env.NEXT_PUBLIC_APP_URL}/auth/login`,
        }),
      })
    }).catch(console.error)
  }

  return NextResponse.json({ success: true, no_rm, queue: (queueCount ?? 0) + 1 })
}
