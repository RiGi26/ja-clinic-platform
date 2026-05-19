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
    .select('id, no_rm, full_name, phone, date_of_birth, gender, blood_type, allergies, weight, height, address, emergency_contact, emergency_phone, no_bpjs, jenis_penjamin')
    .eq('user_id', user.id)
    .eq('clinic_id', profile.clinic_id)
    .single()

  return { clinicId: profile.clinic_id, patient: patient ?? null }
}

export async function GET() {
  const info = await getPatientInfo()
  if (!info) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json({ patient: info.patient })
}

export async function PATCH(request: Request) {
  const info = await getPatientInfo()
  if (!info || !info.patient) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { date_of_birth, gender, phone, blood_type, allergies, height, weight, address, emergency_contact, emergency_phone, no_bpjs, jenis_penjamin } = body

  const db = createAdminClient()
  const { error } = await db.from('patients')
    .update({ date_of_birth, gender, phone, blood_type, allergies, height, weight, address, emergency_contact, emergency_phone, no_bpjs: no_bpjs || null, jenis_penjamin: jenis_penjamin || 'umum' })
    .eq('id', info.patient.id)
    .eq('clinic_id', info.clinicId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
