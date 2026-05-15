import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

async function getPatientInfo() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const db = createAdminClient()
  const { data: profile } = await db.from('users').select('clinic_id, role').eq('id', user.id).single()
  if (!profile || profile.role !== 'patient') return null

  const { data: patient } = await db
    .from('patients')
    .select('id, no_rm, blood_type, allergies, weight, height')
    .eq('user_id', user.id)
    .eq('clinic_id', profile.clinic_id)
    .single()

  return { clinicId: profile.clinic_id, patient: patient ?? null }
}

export async function GET() {
  const info = await getPatientInfo()
  if (!info) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!info.patient) return NextResponse.json({ records: [], patient: null })

  const db = createAdminClient()

  const { data: records } = await db
    .from('medical_records')
    .select(`
      id, created_at, diagnoses, notes, treatment,
      blood_pressure_sys, blood_pressure_dia, temperature, weight, heart_rate,
      doctors(full_name)
    `)
    .eq('clinic_id', info.clinicId)
    .eq('patient_id', info.patient.id)
    .order('created_at', { ascending: false })

  const { data: prescriptions } = records && records.length > 0
    ? await db.from('prescriptions')
        .select('medical_record_id, medication_name, dosage, frequency, duration')
        .in('medical_record_id', records.map(r => r.id))
    : { data: [] }

  const recordsWithPrescriptions = (records ?? []).map(r => ({
    ...r,
    prescriptions: (prescriptions ?? []).filter(p => p.medical_record_id === r.id),
  }))

  return NextResponse.json({ records: recordsWithPrescriptions, patient: info.patient })
}
