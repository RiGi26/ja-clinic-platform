import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

async function getDoctorInfo() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const db = createAdminClient()
  const { data: profile } = await db.from('users').select('clinic_id, role').eq('id', user.id).single()
  if (!profile || profile.role !== 'doctor') return null
  const { data: doctor } = await db.from('doctors').select('id').eq('user_id', user.id).eq('clinic_id', profile.clinic_id).single()
  if (!doctor) return null
  return { clinicId: profile.clinic_id as string, doctorId: doctor.id as string }
}

export async function GET() {
  const info = await getDoctorInfo()
  if (!info) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createAdminClient()
  const { data, error } = await db
    .from('medical_letters')
    .select('id, letter_number, type, diagnosis, created_at, patients(full_name, no_rm)')
    .eq('doctor_id', info.doctorId)
    .eq('clinic_id', info.clinicId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: data ?? [] })
}

export async function POST(request: Request) {
  const info = await getDoctorInfo()
  if (!info) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as {
    patient_id: string; appointment_id?: string
    type: string; diagnosis?: string; notes?: string
    sick_days?: number; sick_from?: string; sick_until?: string
    referred_to?: string; referral_reason?: string; purpose?: string
  }

  if (!body.patient_id) return NextResponse.json({ error: 'patient_id wajib' }, { status: 400 })
  if (!['sakit', 'sehat', 'rujukan'].includes(body.type)) {
    return NextResponse.json({ error: 'Jenis surat tidak valid' }, { status: 400 })
  }

  const db = createAdminClient()
  const { data: letterNumber } = await db.rpc('generate_letter_number', {
    p_clinic_id: info.clinicId,
    p_type: body.type,
  })

  const { data, error } = await db.from('medical_letters').insert({
    clinic_id:       info.clinicId,
    patient_id:      body.patient_id,
    doctor_id:       info.doctorId,
    appointment_id:  body.appointment_id ?? null,
    type:            body.type,
    letter_number:   letterNumber as string,
    diagnosis:       body.diagnosis ?? null,
    notes:           body.notes ?? null,
    sick_days:       body.sick_days ?? null,
    sick_from:       body.sick_from ?? null,
    sick_until:      body.sick_until ?? null,
    referred_to:     body.referred_to ?? null,
    referral_reason: body.referral_reason ?? null,
    purpose:         body.purpose ?? null,
  }).select('id, letter_number').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data })
}
