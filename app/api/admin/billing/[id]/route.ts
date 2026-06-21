import { NextResponse } from 'next/server'
import { requireApiUser } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiUser({ roles: ['admin', 'receptionist'] })
  if (!auth.ok) return auth.res
  const { db, clinicId } = auth

  const { id } = await params
  const { payment_method } = await request.json()

  const VALID_METHODS = ['cash', 'transfer', 'bpjs', 'insurance']
  if (!payment_method || !VALID_METHODS.includes(payment_method)) {
    return NextResponse.json({ error: 'Metode pembayaran tidak valid' }, { status: 400 })
  }

  const { error } = await db
    .from('billing')
    .update({ status: 'paid', payment_method, paid_at: new Date().toISOString() })
    .eq('id', id)
    .eq('clinic_id', clinicId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
