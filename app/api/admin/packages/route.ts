import { NextResponse } from 'next/server'
import { requireApiUser, belongsToClinic } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

// PostgREST returns a to-one embed as an object at runtime, but supabase-js types
// it as an array — normalize either shape.
function relOne<T>(rel: unknown): T | null {
  return ((Array.isArray(rel) ? rel[0] : rel) ?? null) as T | null
}

// GET /api/admin/packages — the clinic's package catalog (+ subscription count)
export async function GET(request: Request) {
  const auth = await requireApiUser({ roles: ['admin'] })
  if (!auth.ok) return auth.res
  const { db, clinicId } = auth

  const { searchParams } = new URL(request.url)
  const activeOnly = searchParams.get('active') === 'true'

  let query = db
    .from('service_packages')
    .select('id, name, treatment_id, num_sessions, price, validity_days, is_active, created_at, treatments(name)')
    .eq('clinic_id', clinicId)
    .order('created_at', { ascending: false })
  if (activeOnly) query = query.eq('is_active', true)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Active-subscription count per package (tiny data → count in app).
  const { data: subs } = await db
    .from('patient_package_subscriptions')
    .select('package_id')
    .eq('clinic_id', clinicId)
    .eq('status', 'active')
  const counts = new Map<string, number>()
  for (const s of subs ?? []) counts.set(s.package_id, (counts.get(s.package_id) ?? 0) + 1)

  const packages = (data ?? []).map(p => ({
    id: p.id, name: p.name, treatment_id: p.treatment_id,
    num_sessions: p.num_sessions, price: p.price, validity_days: p.validity_days,
    is_active: p.is_active, created_at: p.created_at,
    treatment_name: relOne<{ name: string }>(p.treatments)?.name ?? null,
    active_subscriptions: counts.get(p.id) ?? 0,
  }))
  return NextResponse.json({ packages })
}

// POST /api/admin/packages — create a package
export async function POST(request: Request) {
  const auth = await requireApiUser({ roles: ['admin'], activeClinic: true })
  if (!auth.ok) return auth.res
  const { db, clinicId } = auth

  const body = await request.json() as {
    name?: string; treatment_id?: string | null; num_sessions?: number; price?: number; validity_days?: number | null
  }

  if (!body.name?.trim()) return NextResponse.json({ error: 'Nama paket wajib diisi' }, { status: 400 })
  if (!Number.isInteger(body.num_sessions) || (body.num_sessions ?? 0) < 1)
    return NextResponse.json({ error: 'Jumlah sesi harus bilangan bulat ≥ 1' }, { status: 400 })
  if (typeof body.price !== 'number' || body.price < 0)
    return NextResponse.json({ error: 'Harga harus angka ≥ 0' }, { status: 400 })
  if (body.validity_days != null && (!Number.isInteger(body.validity_days) || body.validity_days < 1))
    return NextResponse.json({ error: 'Masa berlaku (hari) harus bilangan bulat ≥ 1, atau kosong' }, { status: 400 })
  if (body.treatment_id && !(await belongsToClinic(db, 'treatments', body.treatment_id, clinicId)))
    return NextResponse.json({ error: 'Tindakan tidak valid' }, { status: 400 })

  const { data, error } = await db
    .from('service_packages')
    .insert({
      clinic_id:     clinicId,
      name:          body.name.trim(),
      treatment_id:  body.treatment_id || null,
      num_sessions:  body.num_sessions,
      price:         body.price,
      validity_days: body.validity_days ?? null,
    })
    .select('id, name, treatment_id, num_sessions, price, validity_days, is_active, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ package: data }, { status: 201 })
}
