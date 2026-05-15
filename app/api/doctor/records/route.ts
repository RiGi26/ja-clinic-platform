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

  const { data: doctor } = await db.from('doctors').select('id, full_name').eq('user_id', user.id).eq('clinic_id', profile.clinic_id).single()

  return { clinicId: profile.clinic_id, doctorId: doctor?.id ?? null, doctorName: doctor?.full_name ?? '' }
}

export async function GET(request: Request) {
  const info = await getDoctorInfo()
  if (!info) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const appointmentId = searchParams.get('appointment_id')

  const db = createAdminClient()

  if (appointmentId) {
    // Get appointment + patient detail for record form
    const { data: apt } = await db
      .from('appointments')
      .select(`
        id, complaint, status,
        patients(id, no_rm, full_name, date_of_birth, gender, blood_type, allergies, weight, height)
      `)
      .eq('id', appointmentId)
      .eq('clinic_id', info.clinicId)
      .single()

    if (!apt) return NextResponse.json({ error: 'Appointment tidak ditemukan' }, { status: 404 })

    // Get medical history for this patient
    const patient = (apt as any).patients
    const { data: history } = await db
      .from('medical_records')
      .select('id, diagnoses, notes, created_at, doctors(full_name)')
      .eq('patient_id', patient?.id)
      .eq('clinic_id', info.clinicId)
      .order('created_at', { ascending: false })
      .limit(5)

    return NextResponse.json({ appointment: apt, history: history ?? [] })
  }

  return NextResponse.json({ error: 'appointment_id wajib' }, { status: 400 })
}

export async function POST(request: Request) {
  const info = await getDoctorInfo()
  if (!info) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const {
    appointment_id, patient_id,
    blood_pressure_sys, blood_pressure_dia, temperature, weight, heart_rate,
    chief_complaint, diagnoses, treatment, notes,
    medications, // array of { medication_name, dosage, frequency, duration, notes }
    complete, // boolean — jika true, update appointment status ke selesai
  } = body

  if (!appointment_id || !patient_id) {
    return NextResponse.json({ error: 'appointment_id dan patient_id wajib' }, { status: 400 })
  }

  const db = createAdminClient()

  // Insert medical record
  const { data: record, error: recErr } = await db
    .from('medical_records')
    .insert({
      clinic_id: info.clinicId,
      appointment_id,
      patient_id,
      doctor_id: info.doctorId,
      blood_pressure_sys: blood_pressure_sys || null,
      blood_pressure_dia: blood_pressure_dia || null,
      temperature: temperature || null,
      weight: weight || null,
      heart_rate: heart_rate || null,
      chief_complaint: chief_complaint || null,
      diagnoses: diagnoses ?? [],
      treatment: treatment || null,
      notes: notes || null,
    })
    .select('id')
    .single()

  if (recErr) return NextResponse.json({ error: recErr.message }, { status: 500 })

  // Insert prescriptions
  if (medications && medications.length > 0 && record) {
    const prescRows = medications
      .filter((m: any) => m.medication_name)
      .map((m: any) => ({
        clinic_id        : info.clinicId,
        medical_record_id: record.id,
        medication_name  : m.medication_name,
        dosage           : m.dosage || '—',
        frequency        : m.frequency || '—',
        duration         : m.duration || '—',
        notes            : m.notes || null,
      }))
    if (prescRows.length > 0) {
      await db.from('prescriptions').insert(prescRows)
    }
  }

  // Update appointment status
  if (complete) {
    await db.from('appointments').update({ status: 'selesai' }).eq('id', appointment_id).eq('clinic_id', info.clinicId)
  }

  return NextResponse.json({ success: true, record_id: record?.id })
}
