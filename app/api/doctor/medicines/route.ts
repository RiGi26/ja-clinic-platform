import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

async function getDoctorClinicId() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const db = createAdminClient()
  const { data } = await db.from('users').select('clinic_id, role').eq('id', user.id).single()
  if (!data?.clinic_id || data.role !== 'doctor') return null
  return data.clinic_id as string
}

export async function GET(request: Request) {
  const clinicId = await getDoctorClinicId()
  if (!clinicId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')

  const db = createAdminClient()
  let query = db.from('medicines')
    .select('id, name, generic_name, unit, stock, price')
    .eq('clinic_id', clinicId)
    .eq('is_active', true)
    .order('name')
    .limit(10)

  if (q) query = query.ilike('name', `%${q}%`)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ medicines: data ?? [] })
}
