import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

async function getClinicId() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const db = createAdminClient()
  const { data } = await db.from('users').select('clinic_id, role').eq('id', user.id).single()
  if (!data?.clinic_id || !['admin', 'receptionist'].includes(data.role)) return null
  return data.clinic_id as string
}

export async function GET(request: Request) {
  const clinicId = await getClinicId()
  if (!clinicId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const doctorId = searchParams.get('doctor_id')

  const now   = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const end   = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString()

  const db = createAdminClient()
  let q = db.from('appointments')
    .select(`
      id, scheduled_at, status, complaint, queue_number, type,
      patients(id, full_name, no_rm, phone),
      doctors(id, full_name, specialty)
    `)
    .eq('clinic_id', clinicId)
    .gte('scheduled_at', start)
    .lt('scheduled_at', end)
    .neq('status', 'batal')
    .order('queue_number', { ascending: true, nullsFirst: false })
    .order('scheduled_at', { ascending: true })

  if (doctorId) q = q.eq('doctor_id', doctorId)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ queue: data ?? [] })
}

export async function PATCH(request: Request) {
  const clinicId = await getClinicId()
  if (!clinicId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { appointment_id, status } = await request.json() as { appointment_id: string; status: string }
  const VALID = ['menunggu', 'dipanggil', 'diperiksa', 'selesai', 'batal']
  if (!VALID.includes(status)) return NextResponse.json({ error: 'Status tidak valid' }, { status: 400 })

  const db = createAdminClient()
  const { error } = await db
    .from('appointments')
    .update({ status })
    .eq('id', appointment_id)
    .eq('clinic_id', clinicId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
