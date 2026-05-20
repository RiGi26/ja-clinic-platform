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
  const appointmentId    = searchParams.get('appointment_id')
  if (!appointmentId) return NextResponse.json({ prescription: null })

  const db = createAdminClient()
  const { data } = await db
    .from('prescriptions')
    .select(`
      id, status, prescription_number,
      prescription_items(quantity, medicines(price))
    `)
    .eq('appointment_id', appointmentId)
    .eq('clinic_id', clinicId)
    .single()

  return NextResponse.json({ prescription: data ?? null })
}
