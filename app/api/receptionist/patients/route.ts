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
  const q = searchParams.get('q')

  const db = createAdminClient()
  let query = db.from('patients')
    .select('id, no_rm, full_name, phone, date_of_birth, gender, no_bpjs, jenis_penjamin')
    .eq('clinic_id', clinicId)
    .order('full_name')
    .limit(20)

  if (q) {
    query = query.or(`full_name.ilike.%${q}%,phone.ilike.%${q}%,no_rm.ilike.%${q}%,no_bpjs.ilike.%${q}%`)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ patients: data ?? [] })
}

export async function POST(request: Request) {
  const clinicId = await getClinicId()
  if (!clinicId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as {
    full_name: string; phone?: string; date_of_birth?: string
    gender?: string; address?: string; no_bpjs?: string; jenis_penjamin?: string
  }

  if (!body.full_name?.trim()) return NextResponse.json({ error: 'Nama lengkap wajib diisi' }, { status: 400 })

  const db = createAdminClient()
  const yr  = new Date().getFullYear()
  const { count } = await db.from('patients').select('*', { count: 'exact', head: true }).eq('clinic_id', clinicId)
  const no_rm = `RM-${yr}-${String((count ?? 0) + 1).padStart(4, '0')}`

  const { data, error } = await db.from('patients').insert({
    clinic_id:      clinicId,
    no_rm,
    full_name:      body.full_name.trim(),
    phone:          body.phone || null,
    date_of_birth:  body.date_of_birth || null,
    gender:         body.gender || null,
    address:        body.address || null,
    no_bpjs:        body.no_bpjs || null,
    jenis_penjamin: body.jenis_penjamin || 'umum',
  }).select('id, no_rm, full_name').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, patient: data })
}
