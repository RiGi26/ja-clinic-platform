import { NextResponse } from 'next/server'
import { requireApiUser, type ApiAuthOk } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

// A branch can't be closed while active therapists are still assigned to it —
// they'd be stranded in a hidden branch. Force reassignment first.
async function activeDoctorsAt(db: ApiAuthOk['db'], locationId: string, clinicId: string): Promise<number> {
  const { count } = await db
    .from('doctors')
    .select('id', { count: 'exact', head: true })
    .eq('clinic_id', clinicId)
    .eq('location_id', locationId)
    .eq('is_active', true)
  return count ?? 0
}

// PATCH /api/admin/locations/[id] — edit a branch (incl. activate/deactivate)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser({ roles: ['admin'], activeClinic: true })
  if (!auth.ok) return auth.res
  const { db, clinicId } = auth
  const { id } = await params

  const body = await request.json() as {
    name?: string; address?: string; phone?: string; working_hours?: unknown; is_active?: boolean
  }

  const updates: Record<string, unknown> = {}
  if (body.name !== undefined) {
    if (!body.name.trim()) return NextResponse.json({ error: 'Nama cabang wajib diisi' }, { status: 400 })
    updates.name = body.name.trim()
  }
  if (body.address !== undefined)       updates.address       = body.address?.trim() || null
  if (body.phone !== undefined)         updates.phone         = body.phone?.trim() || null
  if (body.working_hours !== undefined) updates.working_hours = body.working_hours ?? {}
  if (body.is_active !== undefined)     updates.is_active     = body.is_active

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Tidak ada field yang diupdate' }, { status: 400 })
  }

  if (body.is_active === false) {
    const n = await activeDoctorsAt(db, id, clinicId)
    if (n > 0) {
      return NextResponse.json(
        { error: `Masih ada ${n} terapis aktif di cabang ini. Pindahkan dulu sebelum menonaktifkan cabang.` },
        { status: 409 },
      )
    }
  }

  const { error } = await db
    .from('locations')
    .update(updates)
    .eq('id', id)
    .eq('clinic_id', clinicId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

// DELETE /api/admin/locations/[id] — soft-close (is_active = false)
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser({ roles: ['admin'], activeClinic: true })
  if (!auth.ok) return auth.res
  const { db, clinicId } = auth
  const { id } = await params

  const n = await activeDoctorsAt(db, id, clinicId)
  if (n > 0) {
    return NextResponse.json(
      { error: `Masih ada ${n} terapis aktif di cabang ini. Pindahkan dulu sebelum menutup cabang.` },
      { status: 409 },
    )
  }

  const { error } = await db
    .from('locations')
    .update({ is_active: false })
    .eq('id', id)
    .eq('clinic_id', clinicId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
