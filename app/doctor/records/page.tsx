import { redirect } from 'next/navigation'
import { getClinicUser } from '@/lib/clinic'
import { createAdminClient } from '@/lib/supabase/server'
import MedicalRecordForm from './MedicalRecordForm'

export const dynamic = 'force-dynamic'

export default async function MedicalRecordPage({
  searchParams,
}: {
  searchParams: Promise<{ apt?: string }>
}) {
  const user = await getClinicUser()
  if (user.role !== 'doctor') redirect('/auth/login')

  const { apt: aptId } = await searchParams
  if (!aptId) redirect('/doctor')

  const db = createAdminClient()

  const { data: apt } = await db
    .from('appointments')
    .select(`
      id, complaint, status,
      patients(id, no_rm, full_name, date_of_birth, gender, blood_type, allergies, weight, height)
    `)
    .eq('id', aptId)
    .eq('clinic_id', user.clinic_id)
    .single()

  if (!apt) redirect('/doctor')

  const patient = (apt as any).patients
  const patientId = patient?.id

  const { data: history } = patientId ? await db
    .from('medical_records')
    .select('id, diagnoses, notes, created_at, doctors(full_name)')
    .eq('patient_id', patientId)
    .eq('clinic_id', user.clinic_id)
    .order('created_at', { ascending: false })
    .limit(5)
    : { data: [] }

  return (
    <MedicalRecordForm
      appointment={apt as any}
      patient={patient}
      history={(history ?? []) as any}
    />
  )
}
