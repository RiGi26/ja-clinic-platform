import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createAdminClient()
  const { data: profile } = await db.from('users').select('clinic_id').eq('id', user.id).single()
  if (!profile?.clinic_id) return NextResponse.json({ clinic: null, doctors: [] })

  const [{ data: clinic }, { data: doctors }] = await Promise.all([
    db.from('clinics').select('name, address, phone, email').eq('id', profile.clinic_id).single(),
    db.from('doctors').select('id, full_name, specialty, consultation_fee, is_active').eq('clinic_id', profile.clinic_id).order('full_name'),
  ])

  return NextResponse.json({ clinic: clinic ?? {}, doctors: doctors ?? [] })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createAdminClient()
  const { data: profile } = await db.from('users').select('clinic_id').eq('id', user.id).single()
  if (!profile?.clinic_id) return NextResponse.json({ error: 'Clinic not found' }, { status: 400 })

  const { clinic, doctors } = await request.json()
  const clinicId = profile.clinic_id

  // Update clinic info
  await db.from('clinics').update({ name: clinic.name, address: clinic.address, phone: clinic.phone, email: clinic.email }).eq('id', clinicId)

  // Upsert doctors
  for (const doc of doctors) {
    if (doc.id) {
      await db.from('doctors').update({ full_name: doc.full_name, specialty: doc.specialty, consultation_fee: doc.consultation_fee, is_active: doc.is_active }).eq('id', doc.id)
    } else {
      await db.from('doctors').insert({ clinic_id: clinicId, full_name: doc.full_name, specialty: doc.specialty, consultation_fee: doc.consultation_fee, is_active: doc.is_active })
    }
  }

  return NextResponse.json({ success: true })
}
