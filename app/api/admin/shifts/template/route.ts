import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

async function getAdminClinicId() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const db = createAdminClient()
  const { data } = await db.from('users').select('clinic_id, role').eq('id', user.id).single()
  if (!data?.clinic_id || data.role !== 'admin') return null
  return data.clinic_id as string
}

export async function GET() {
  const clinicId = await getAdminClinicId()
  if (!clinicId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createAdminClient()
  const { data, error } = await db
    .from('shift_templates')
    .select('*, users(full_name, role)')
    .eq('clinic_id', clinicId)
    .order('user_id').order('day_of_week')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: data ?? [] })
}

export async function POST(request: Request) {
  const clinicId = await getAdminClinicId()
  if (!clinicId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as { user_id: string; day_of_week: number; shift: string }
  if (!body.user_id || body.day_of_week === undefined || !body.shift) {
    return NextResponse.json({ error: 'user_id, day_of_week, shift wajib' }, { status: 400 })
  }

  const db = createAdminClient()
  const { data, error } = await db.from('shift_templates').upsert({
    clinic_id:   clinicId,
    user_id:     body.user_id,
    day_of_week: body.day_of_week,
    shift:       body.shift,
  }, { onConflict: 'clinic_id,user_id,day_of_week' }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data })
}

export async function DELETE(request: Request) {
  const clinicId = await getAdminClinicId()
  if (!clinicId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as { user_id: string; day_of_week: number }
  const db = createAdminClient()
  await db.from('shift_templates')
    .delete()
    .eq('clinic_id', clinicId)
    .eq('user_id', body.user_id)
    .eq('day_of_week', body.day_of_week)

  return NextResponse.json({ success: true })
}
