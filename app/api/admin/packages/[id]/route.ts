import { NextResponse } from 'next/server'
import { requireApiUser, belongsToClinic } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

// PATCH /api/admin/packages/[id] — edit a package (incl. activate/deactivate).
// Editing num_sessions/price does NOT touch existing subscriptions — those
// snapshot their totals at purchase time, so history is preserved.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser({ roles: ['admin'], activeClinic: true })
  if (!auth.ok) return auth.res
  const { db, clinicId } = auth
  const { id } = await params

  const body = await request.json() as {
    name?: string; treatment_id?: string | null; num_sessions?: number
    price?: number; validity_days?: number | null; is_active?: boolean
  }

  const updates: Record<string, unknown> = {}
  if (body.name !== undefined) {
    if (!body.name.trim()) return NextResponse.json({ error: 'Nama paket wajib diisi' }, { status: 400 })
    updates.name = body.name.trim()
  }
  if (body.treatment_id !== undefined) {
    if (body.treatment_id && !(await belongsToClinic(db, 'treatments', body.treatment_id, clinicId)))
      return NextResponse.json({ error: 'Tindakan tidak valid' }, { status: 400 })
    updates.treatment_id = body.treatment_id || null
  }
  if (body.num_sessions !== undefined) {
    if (!Number.isInteger(body.num_sessions) || body.num_sessions < 1)
      return NextResponse.json({ error: 'Jumlah sesi harus bilangan bulat ≥ 1' }, { status: 400 })
    updates.num_sessions = body.num_sessions
  }
  if (body.price !== undefined) {
    if (typeof body.price !== 'number' || body.price < 0)
      return NextResponse.json({ error: 'Harga harus angka ≥ 0' }, { status: 400 })
    updates.price = body.price
  }
  if (body.validity_days !== undefined) {
    if (body.validity_days != null && (!Number.isInteger(body.validity_days) || body.validity_days < 1))
      return NextResponse.json({ error: 'Masa berlaku (hari) harus bilangan bulat ≥ 1, atau kosong' }, { status: 400 })
    updates.validity_days = body.validity_days ?? null
  }
  if (body.is_active !== undefined) updates.is_active = body.is_active

  if (Object.keys(updates).length === 0)
    return NextResponse.json({ error: 'Tidak ada field yang diupdate' }, { status: 400 })

  const { error } = await db
    .from('service_packages')
    .update(updates)
    .eq('id', id)
    .eq('clinic_id', clinicId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

// DELETE /api/admin/packages/[id] — soft-close (is_active = false). Existing
// subscriptions keep working (they're snapshotted); the package just stops being
// sellable. FK is ON DELETE RESTRICT, so we never hard-delete.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser({ roles: ['admin'], activeClinic: true })
  if (!auth.ok) return auth.res
  const { db, clinicId } = auth
  const { id } = await params

  const { error } = await db
    .from('service_packages')
    .update({ is_active: false })
    .eq('id', id)
    .eq('clinic_id', clinicId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
