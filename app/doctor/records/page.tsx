import { redirect } from 'next/navigation'
import { getClinicUser } from '@/lib/clinic'
import { createAdminClient } from '@/lib/supabase/server'
import TopBar from '@/components/TopBar'
import MedicalRecordForm from './MedicalRecordForm'
import RecordsListClient from './RecordsListClient'

export const dynamic = 'force-dynamic'

export default async function MedicalRecordPage({
  searchParams,
}: {
  searchParams: Promise<{ apt?: string }>
}) {
  const user = await getClinicUser()
  if (user.role !== 'doctor') redirect('/auth/login')

  const { apt: aptId } = await searchParams
  const db  = createAdminClient()
  const cid = user.clinic_id

  const { data: clinic } = await db.from('clinics').select('enable_physio').eq('id', cid).single()
  const enablePhysio = !!clinic?.enable_physio

  // ── Form mode: ?apt=xxx ──────────────────────────────────────────────────
  if (aptId) {
    const { data: apt } = await db
      .from('appointments')
      .select(`
        id, complaint, status,
        patients(id, no_rm, full_name, date_of_birth, gender, blood_type, allergies, weight, height)
      `)
      .eq('id', aptId)
      .eq('clinic_id', cid)
      .single()

    if (!apt) redirect('/doctor')

    const patient   = (apt as unknown as { patients: { id: string } }).patients
    const patientId = (patient as unknown as { id: string } | null)?.id

    const { data: history } = patientId ? await db
      .from('medical_records')
      .select('id, chief_complaint, soap_assessment, diagnoses, notes, created_at, doctors(full_name)')
      .eq('patient_id', patientId)
      .eq('clinic_id', cid)
      .order('created_at', { ascending: false })
      .limit(5)
      : { data: [] }

    return (
      <MedicalRecordForm
        appointment={apt as { id: string; complaint: string | null }}
        patient={patient as Parameters<typeof MedicalRecordForm>[0]['patient']}
        history={(history ?? []) as unknown as Parameters<typeof MedicalRecordForm>[0]['history']}
        enablePhysio={enablePhysio}
      />
    )
  }

  // ── List mode: /doctor/records ───────────────────────────────────────────
  const { data: records } = await db
    .from('medical_records')
    .select(`
      id, created_at, chief_complaint, soap_assessment, icd10_codes,
      patients ( full_name, no_rm ),
      doctors  ( full_name )
    `)
    .eq('clinic_id', cid)
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div className="min-h-screen bg-background">
      <TopBar title="Rekam Medis" subtitle="Riwayat pemeriksaan pasien" />
      <div className="p-8">
        <RecordsListClient records={(records ?? []) as unknown as Parameters<typeof RecordsListClient>[0]['records']} />
      </div>
    </div>
  )
}
