import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

async function getAdminClinicId() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const db = createAdminClient()
  const { data } = await db.from('users').select('clinic_id, role').eq('id', user.id).single()
  if (!data?.clinic_id || !['admin', 'receptionist'].includes(data.role)) return null
  return data.clinic_id as string
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const clinicId = await getAdminClinicId()
  if (!clinicId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const db = createAdminClient()

  const [
    { data: patient },
    { data: appointments },
    { data: records },
    { data: billing },
    { data: letters },
    { data: clinic },
  ] = await Promise.all([
    db.from('patients').select('*').eq('id', id).eq('clinic_id', clinicId).single(),
    db.from('appointments')
      .select('id, scheduled_at, status, complaint, type, queue_number, doctors(full_name)')
      .eq('patient_id', id).eq('clinic_id', clinicId)
      .order('scheduled_at', { ascending: false }).limit(20),
    db.from('medical_records')
      .select('id, created_at, diagnoses, soap_assessment, soap_subjective, soap_objective, soap_plan, blood_pressure_sys, blood_pressure_dia, temperature, heart_rate, weight, height, rom_entries, vas_pain_before, vas_pain_after, prescribed_exercises, adherence_notes, next_visit_target, doctors(full_name), prescriptions(medication_name, dosage, frequency, duration)')
      .eq('patient_id', id).eq('clinic_id', clinicId)
      .order('created_at', { ascending: false }).limit(10),
    db.from('billing')
      .select('id, invoice_number, total, status, payment_method, created_at')
      .eq('patient_id', id).eq('clinic_id', clinicId)
      .order('created_at', { ascending: false }).limit(10),
    db.from('medical_letters')
      .select('id, letter_number, type, diagnosis, created_at, doctors(full_name)')
      .eq('patient_id', id).eq('clinic_id', clinicId)
      .order('created_at', { ascending: false }),
    db.from('clinics').select('enable_physio').eq('id', clinicId).single(),
  ])

  if (!patient) return NextResponse.json({ error: 'Pasien tidak ditemukan' }, { status: 404 })

  // Physio (B3): only fetch photos + expose the flag when the clinic uses physio mode.
  const enablePhysio = !!clinic?.enable_physio
  let photos: { id: string; phase: string; caption: string | null; created_at: string; url: string | null }[] = []
  if (enablePhysio) {
    const { data: rows } = await db
      .from('visit_photos')
      .select('id, phase, caption, storage_path, created_at')
      .eq('patient_id', id).eq('clinic_id', clinicId)
      .order('created_at', { ascending: true })
    photos = await Promise.all(
      (rows ?? []).map(async (r: { id: string; phase: string; caption: string | null; storage_path: string; created_at: string }) => {
        const { data } = await db.storage.from('visit-photos').createSignedUrl(r.storage_path, 3600)
        return { id: r.id, phase: r.phase, caption: r.caption, created_at: r.created_at, url: data?.signedUrl ?? null }
      }),
    )
  }

  const apts       = appointments ?? []
  const bills      = billing ?? []
  const totalVisits = apts.length
  const totalSpent  = bills.filter((b: any) => b.status === 'paid').reduce((s: number, b: any) => s + (b.total ?? 0), 0)
  const lastVisit   = apts[0]?.scheduled_at ?? null

  return NextResponse.json({
    patient,
    appointments: apts,
    records: records ?? [],
    billing: bills,
    letters: letters ?? [],
    stats: { total_visits: totalVisits, total_spent: totalSpent, last_visit: lastVisit },
    enable_physio: enablePhysio,
    physio_photos: photos,
  })
}
