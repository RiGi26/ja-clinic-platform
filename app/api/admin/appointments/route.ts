import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

async function getClinicId() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const db = createAdminClient()
  const { data } = await db.from('users').select('clinic_id').eq('id', user.id).single()
  return data?.clinic_id ?? null
}

export async function GET(request: Request) {
  const clinicId = await getClinicId()
  if (!clinicId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date') // YYYY-MM-DD, default today

  const db = createAdminClient()
  const target = date ? new Date(date) : new Date()
  const start  = new Date(target.getFullYear(), target.getMonth(), target.getDate()).toISOString()
  const end    = new Date(target.getFullYear(), target.getMonth(), target.getDate() + 1).toISOString()

  const { data, error } = await db
    .from('appointments')
    .select(`
      id, scheduled_at, status, complaint, type, queue_number,
      patients(id, no_rm, full_name, phone, date_of_birth, gender, blood_type),
      doctors(id, full_name, specialty)
    `)
    .eq('clinic_id', clinicId)
    .gte('scheduled_at', start)
    .lt('scheduled_at', end)
    .order('queue_number', { ascending: true, nullsFirst: false })
    .order('scheduled_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ appointments: data ?? [] })
}

export async function PATCH(request: Request) {
  const clinicId = await getClinicId()
  if (!clinicId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, status } = await request.json()
  if (!id || !status) return NextResponse.json({ error: 'id dan status wajib' }, { status: 400 })

  const VALID = ['menunggu', 'dipanggil', 'diperiksa', 'selesai', 'batal']
  if (!VALID.includes(status)) return NextResponse.json({ error: 'Status tidak valid' }, { status: 400 })

  const db = createAdminClient()
  const { error } = await db
    .from('appointments')
    .update({ status })
    .eq('id', id)
    .eq('clinic_id', clinicId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
