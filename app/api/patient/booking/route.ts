import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'
import React from 'react'
import AppointmentConfirmed from '@/emails/AppointmentConfirmed'

export const dynamic = 'force-dynamic'

async function getPatientInfo() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const db = createAdminClient()
  const { data: profile } = await db.from('users').select('clinic_id, role').eq('id', user.id).single()
  if (!profile || profile.role !== 'patient') return null

  const { data: patient } = await db.from('patients').select('id, no_rm').eq('user_id', user.id).eq('clinic_id', profile.clinic_id).single()

  return { clinicId: profile.clinic_id, patientId: patient?.id ?? null, userEmail: user.email ?? null }
}

export async function GET() {
  const info = await getPatientInfo()
  if (!info) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createAdminClient()
  const today = new Date().getDay() // 0=Sunday

  const [{ data: doctors }, { data: schedules }] = await Promise.all([
    db.from('doctors')
      .select('id, full_name, specialty, consultation_fee, bio')
      .eq('clinic_id', info.clinicId)
      .eq('is_active', true)
      .order('full_name'),
    db.from('doctor_schedules')
      .select('doctor_id, day_of_week, start_time, end_time, max_patients')
      .eq('clinic_id', info.clinicId)
      .eq('is_active', true),
  ])

  const doctorsWithSchedules = (doctors ?? []).map(doc => {
    const docSchedules = (schedules ?? []).filter(s => s.doctor_id === doc.id)
    const availableToday = docSchedules.some(s => s.day_of_week === today)
    return { ...doc, schedules: docSchedules, availableToday }
  })

  return NextResponse.json({ doctors: doctorsWithSchedules })
}

export async function POST(request: Request) {
  const info = await getPatientInfo()
  if (!info) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!info.patientId) return NextResponse.json({ error: 'Data pasien tidak ditemukan' }, { status: 400 })

  const { doctor_id, scheduled_at, complaint } = await request.json()
  if (!doctor_id || !scheduled_at) return NextResponse.json({ error: 'doctor_id dan scheduled_at wajib' }, { status: 400 })

  const db = createAdminClient()

  // Generate queue number for the day
  const dateStr = scheduled_at.split('T')[0]
  const dayStart = new Date(dateStr + 'T00:00:00.000Z').toISOString()
  const dayEnd   = new Date(dateStr + 'T23:59:59.999Z').toISOString()

  const { count } = await db.from('appointments')
    .select('*', { count: 'exact', head: true })
    .eq('clinic_id', info.clinicId)
    .eq('doctor_id', doctor_id)
    .gte('scheduled_at', dayStart)
    .lte('scheduled_at', dayEnd)

  const queueNumber = (count ?? 0) + 1

  const { data, error } = await db.from('appointments').insert({
    clinic_id   : info.clinicId,
    patient_id  : info.patientId,
    doctor_id,
    scheduled_at,
    complaint   : complaint || null,
    status      : 'menunggu',
    type        : 'booking',
    queue_number: queueNumber,
  }).select('id, queue_number').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (info.userEmail) {
    Promise.all([
      db.from('patients').select('full_name').eq('id', info.patientId).single(),
      db.from('doctors').select('full_name').eq('id', doctor_id).single(),
      db.from('clinics').select('name, address').eq('id', info.clinicId).single(),
    ]).then(([{ data: patient }, { data: doctor }, { data: clinic }]) => {
      if (!patient || !doctor || !clinic) return
      const scheduledAt = new Intl.DateTimeFormat('id-ID', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      }).format(new Date(scheduled_at))
      return sendEmail({
        to: info.userEmail!,
        subject: `Booking Dikonfirmasi — ${clinic.name}`,
        react: React.createElement(AppointmentConfirmed, {
          patientName: patient.full_name,
          clinicName: clinic.name,
          doctorName: doctor.full_name,
          scheduledAt,
          queueNumber: data.queue_number,
          clinicAddress: clinic.address ?? null,
          loginUrl: `${process.env.NEXT_PUBLIC_APP_URL}/patient`,
        }),
      })
    }).catch(console.error)
  }

  return NextResponse.json({ success: true, appointment: data })
}
