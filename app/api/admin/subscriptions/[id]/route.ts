import { NextResponse } from 'next/server'
import { requireApiUser } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

// PATCH /api/admin/subscriptions/[id] — cancel a subscription (status='cancelled').
// A cancelled package can no longer be drawn down at booking. Per-visit session
// refunds are handled separately by release_package_session on appointment cancel.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser({ roles: ['admin'], activeClinic: true })
  if (!auth.ok) return auth.res
  const { db, clinicId } = auth
  const { id } = await params

  const body = await request.json() as { status?: string }
  if (body.status !== 'cancelled')
    return NextResponse.json({ error: 'Status tidak valid' }, { status: 400 })

  const { error } = await db
    .from('patient_package_subscriptions')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .eq('clinic_id', clinicId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
