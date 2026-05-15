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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const clinicId = await getClinicId()
  if (!clinicId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { payment_method } = await request.json()

  const VALID_METHODS = ['cash', 'transfer', 'bpjs', 'insurance']
  if (!payment_method || !VALID_METHODS.includes(payment_method)) {
    return NextResponse.json({ error: 'Metode pembayaran tidak valid' }, { status: 400 })
  }

  const db = createAdminClient()
  const { error } = await db
    .from('billing')
    .update({ status: 'paid', payment_method, paid_at: new Date().toISOString() })
    .eq('id', id)
    .eq('clinic_id', clinicId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
