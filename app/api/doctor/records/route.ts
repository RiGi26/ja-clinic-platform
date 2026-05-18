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

  const { data: doctor } = await db
    .from('doctors')
    .select('id, full_name')
    .eq('user_id', user.id)
    .eq('clinic_id', profile.clinic_id)
    .single()

  return { clinicId: profile.clinic_id, doctorId: doctor?.id ?? null, doctorName: doctor?.full_name ?? '' }
}

export async function GET(request: Request) {
  const info = await getDoctorInfo()
  if (!info) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const appointmentId = searchParams.get('appointment_id')
  const recordId      = searchParams.get('record_id')

  const db = createAdminClient()

  // Fetch single record detail (for modal)
  if (recordId) {
    const { data: record } = await db
      .from('medical_records')
      .select(`
        id, created_at, chief_complaint, diagnoses, treatment, notes,
        soap_subjective, soap_objective, soap_assessment, soap_plan,
        icd10_codes, allergy_notes, follow_up_date, referral,
        blood_pressure_sys, blood_pressure_dia, temperature, weight, height, heart_rate,
        patients ( full_name, no_rm ),
        doctors  ( full_name ),
        prescriptions ( medication_name, dosage, frequency, duration, route, instructions, notes )
      `)
      .eq('id', recordId)
      .eq('clinic_id', info.clinicId)
      .single()

    if (!record) return NextResponse.json({ error: 'Rekam medis tidak ditemukan' }, { status: 404 })
    return NextResponse.json({ record })
  }

  // Fetch appointment + patient detail for form
  if (appointmentId) {
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

    const patient = (apt as unknown as { patients: { id: string } }).patients
    const { data: history } = patient?.id ? await db
      .from('medical_records')
      .select('id, chief_complaint, soap_assessment, diagnoses, notes, created_at, doctors(full_name)')
      .eq('patient_id', patient.id)
      .eq('clinic_id', info.clinicId)
      .order('created_at', { ascending: false })
      .limit(5)
      : { data: [] }

    return NextResponse.json({ appointment: apt, history: history ?? [] })
  }

  // List all records for this clinic
  const { data: records } = await db
    .from('medical_records')
    .select(`
      id, created_at, chief_complaint, soap_assessment, icd10_codes,
      patients ( full_name, no_rm ),
      doctors  ( full_name )
    `)
    .eq('clinic_id', info.clinicId)
    .order('created_at', { ascending: false })
    .limit(50)

  return NextResponse.json({ records: records ?? [] })
}

export async function POST(request: Request) {
  const info = await getDoctorInfo()
  if (!info) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as {
    appointment_id: string
    patient_id: string
    blood_pressure_sys?: number | null
    blood_pressure_dia?: number | null
    temperature?: number | null
    weight?: number | null
    height?: number | null
    heart_rate?: number | null
    chief_complaint?: string | null
    diagnoses?: string[]
    treatment?: string | null
    notes?: string | null
    referral?: string | null
    follow_up_date?: string | null
    soap_subjective?: string | null
    soap_objective?: string | null
    soap_assessment?: string | null
    soap_plan?: string | null
    icd10_codes?: string[]
    allergy_notes?: string | null
    medications?: {
      medication_name: string
      dosage: string
      frequency: string
      duration: string
      route?: string
      instructions?: string
      notes?: string
    }[]
    complete?: boolean
  }

  const { appointment_id, patient_id } = body
  if (!appointment_id || !patient_id) {
    return NextResponse.json({ error: 'appointment_id dan patient_id wajib' }, { status: 400 })
  }

  const db = createAdminClient()

  const { data: record, error: recErr } = await db
    .from('medical_records')
    .insert({
      clinic_id:          info.clinicId,
      appointment_id,
      patient_id,
      doctor_id:          info.doctorId,
      blood_pressure_sys: body.blood_pressure_sys ?? null,
      blood_pressure_dia: body.blood_pressure_dia ?? null,
      temperature:        body.temperature ?? null,
      weight:             body.weight ?? null,
      height:             body.height ?? null,
      heart_rate:         body.heart_rate ?? null,
      chief_complaint:    body.chief_complaint ?? null,
      diagnoses:          body.diagnoses ?? [],
      treatment:          body.treatment ?? null,
      notes:              body.notes ?? null,
      referral:           body.referral ?? null,
      follow_up_date:     body.follow_up_date ?? null,
      soap_subjective:    body.soap_subjective ?? null,
      soap_objective:     body.soap_objective ?? null,
      soap_assessment:    body.soap_assessment ?? null,
      soap_plan:          body.soap_plan ?? null,
      icd10_codes:        body.icd10_codes ?? [],
      allergy_notes:      body.allergy_notes ?? null,
    })
    .select('id')
    .single()

  if (recErr) return NextResponse.json({ error: recErr.message }, { status: 500 })

  if (body.medications && body.medications.length > 0 && record) {
    const prescRows = body.medications
      .filter(m => m.medication_name.trim())
      .map(m => ({
        clinic_id:         info.clinicId,
        medical_record_id: record.id,
        medication_name:   m.medication_name,
        dosage:            m.dosage || '—',
        frequency:         m.frequency || '—',
        duration:          m.duration || '—',
        route:             m.route ?? null,
        instructions:      m.instructions ?? null,
        notes:             m.notes ?? null,
      }))
    if (prescRows.length > 0) {
      await db.from('prescriptions').insert(prescRows)
    }
  }

  if (body.complete) {
    await db
      .from('appointments')
      .update({ status: 'selesai' })
      .eq('id', appointment_id)
      .eq('clinic_id', info.clinicId)
  }

  return NextResponse.json({ success: true, record_id: record?.id })
}
