import { NextResponse } from 'next/server'
import { requireApiUser } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

// GET /api/admin/locations — list branches for the clinic (+ active-therapist count)
export async function GET(request: Request) {
  const auth = await requireApiUser({ roles: ['admin'] })
  if (!auth.ok) return auth.res
  const { db, clinicId } = auth

  const { searchParams } = new URL(request.url)
  const activeOnly = searchParams.get('active') === 'true'

  let query = db
    .from('locations')
    .select('id, name, address, phone, working_hours, is_active, created_at')
    .eq('clinic_id', clinicId)
    .order('created_at', { ascending: true })
  if (activeOnly) query = query.eq('is_active', true)

  const { data: locations, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Attach active-therapist count per branch (tiny data → count in app).
  const { data: docs } = await db
    .from('doctors')
    .select('location_id')
    .eq('clinic_id', clinicId)
    .eq('is_active', true)
  const counts = new Map<string, number>()
  for (const d of docs ?? []) {
    if (d.location_id) counts.set(d.location_id, (counts.get(d.location_id) ?? 0) + 1)
  }

  const withCounts = (locations ?? []).map(l => ({ ...l, doctor_count: counts.get(l.id) ?? 0 }))
  return NextResponse.json({ locations: withCounts })
}

// POST /api/admin/locations — create a branch
export async function POST(request: Request) {
  const auth = await requireApiUser({ roles: ['admin'], activeClinic: true })
  if (!auth.ok) return auth.res
  const { db, clinicId } = auth

  const body = await request.json() as {
    name?: string; address?: string; phone?: string; working_hours?: unknown
  }

  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'Nama cabang wajib diisi' }, { status: 400 })
  }

  const { data, error } = await db
    .from('locations')
    .insert({
      clinic_id:     clinicId,
      name:          body.name.trim(),
      address:       body.address?.trim() || null,
      phone:         body.phone?.trim() || null,
      working_hours: body.working_hours ?? {},
    })
    .select('id, name, address, phone, working_hours, is_active, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ location: { ...data, doctor_count: 0 } }, { status: 201 })
}
