import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { belongsToClinic } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

async function getClinicAndRole() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const db = createAdminClient()
  const { data } = await db.from('users').select('clinic_id, role').eq('id', user.id).single()
  if (!data?.clinic_id || !['admin', 'doctor'].includes(data.role)) return null
  return { clinicId: data.clinic_id as string, role: data.role as string }
}

export async function GET(request: Request) {
  const auth = await getClinicAndRole()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const patient_id = searchParams.get('patient_id')
  const type       = searchParams.get('type')
  const date_from  = searchParams.get('date_from')
  const date_to    = searchParams.get('date_to')

  const db = createAdminClient()
  let q = db.from('medical_letters')
    .select('id, letter_number, type, diagnosis, sick_days, sick_from, sick_until, referred_to, purpose, created_at, patients(full_name, no_rm), doctors(full_name)')
    .eq('clinic_id', auth.clinicId)
    .order('created_at', { ascending: false })

  if (patient_id) q = q.eq('patient_id', patient_id)
  if (type)       q = q.eq('type', type)
  if (date_from)  q = q.gte('created_at', date_from)
  if (date_to)    q = q.lte('created_at', date_to + 'T23:59:59')

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: data ?? [], total: (data ?? []).length })
}

export async function POST(request: Request) {
  const auth = await getClinicAndRole()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as {
    patient_id: string; doctor_id: string; appointment_id?: string
    type: string; diagnosis?: string; notes?: string
    sick_days?: number; sick_from?: string; sick_until?: string
    referred_to?: string; referral_reason?: string; purpose?: string
  }

  if (!body.patient_id || !body.doctor_id) {
    return NextResponse.json({ error: 'patient_id dan doctor_id wajib' }, { status: 400 })
  }
  if (!['sakit', 'sehat', 'rujukan'].includes(body.type)) {
    return NextResponse.json({ error: 'Jenis surat tidak valid' }, { status: 400 })
  }

  const db = createAdminClient()

  // Cross-tenant guards: patient & doctor must belong to this clinic
  if (!(await belongsToClinic(db, 'patients', body.patient_id, auth.clinicId))) {
    return NextResponse.json({ error: 'Pasien tidak ditemukan' }, { status: 404 })
  }
  if (!(await belongsToClinic(db, 'doctors', body.doctor_id, auth.clinicId))) {
    return NextResponse.json({ error: 'Dokter tidak ditemukan' }, { status: 404 })
  }

  const { data: letterNumber } = await db.rpc('generate_letter_number', {
    p_clinic_id: auth.clinicId,
    p_type: body.type,
  })

  const { data, error } = await db.from('medical_letters').insert({
    clinic_id:       auth.clinicId,
    patient_id:      body.patient_id,
    doctor_id:       body.doctor_id,
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
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data })
}
