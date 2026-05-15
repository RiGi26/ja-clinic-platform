import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

async function getDoctorInfo() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const db = createAdminClient()
  const { data: profile } = await db
    .from('users')
    .select('clinic_id, role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'doctor') return null

  const { data: doctor } = await db
    .from('doctors')
    .select('id')
    .eq('user_id', user.id)
    .eq('clinic_id', profile.clinic_id)
    .single()

  return { userId: user.id, clinicId: profile.clinic_id, doctorId: doctor?.id ?? null }
}

export async function GET() {
  const info = await getDoctorInfo()
  if (!info) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createAdminClient()
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const todayEnd   = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString()

  const query = db
    .from('appointments')
    .select(`
      id, scheduled_at, status, complaint, type, queue_number,
      patients(id, no_rm, full_name, phone, date_of_birth, gender, blood_type, allergies, weight, height)
    `)
    .eq('clinic_id', info.clinicId)
    .gte('scheduled_at', todayStart)
    .lt('scheduled_at', todayEnd)
    .neq('status', 'batal')
    .order('queue_number', { ascending: true, nullsFirst: false })

  if (info.doctorId) query.eq('doctor_id', info.doctorId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ queue: data ?? [] })
}

export async function PATCH(request: Request) {
  const info = await getDoctorInfo()
  if (!info) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, status } = await request.json()
  if (!id || !status) return NextResponse.json({ error: 'id dan status wajib' }, { status: 400 })

  const VALID = ['menunggu', 'dipanggil', 'diperiksa', 'selesai', 'batal']
  if (!VALID.includes(status)) return NextResponse.json({ error: 'Status tidak valid' }, { status: 400 })

  const db = createAdminClient()
  const { error } = await db
    .from('appointments')
    .update({ status })
    .eq('id', id)
    .eq('clinic_id', info.clinicId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
