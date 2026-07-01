import { NextResponse } from 'next/server'
import { requireApiUser, belongsToClinic } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

// PostgREST returns a to-one embed as an object at runtime, but supabase-js types
// it as an array — normalize either shape.
function relOne<T>(rel: unknown): T | null {
  return ((Array.isArray(rel) ? rel[0] : rel) ?? null) as T | null
}

// GET /api/admin/subscriptions — a clinic's package purchases (patient + package
// names joined). Optional ?patient_id= filter for a single patient's packages.
export async function GET(request: Request) {
  const auth = await requireApiUser({ roles: ['admin'] })
  if (!auth.ok) return auth.res
  const { db, clinicId } = auth

  const { searchParams } = new URL(request.url)
  const patientId = searchParams.get('patient_id')

  let query = db
    .from('patient_package_subscriptions')
    .select('id, patient_id, package_id, sessions_total, sessions_remaining, price_paid, purchased_at, expires_at, status, patients(full_name, no_rm), service_packages(name)')
    .eq('clinic_id', clinicId)
    .order('purchased_at', { ascending: false })
  if (patientId) query = query.eq('patient_id', patientId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const subscriptions = (data ?? []).map(s => {
    const pat = relOne<{ full_name: string; no_rm: string }>(s.patients)
    const pkg = relOne<{ name: string }>(s.service_packages)
    return {
      id: s.id, patient_id: s.patient_id, package_id: s.package_id,
      sessions_total: s.sessions_total, sessions_remaining: s.sessions_remaining,
      price_paid: s.price_paid, purchased_at: s.purchased_at, expires_at: s.expires_at, status: s.status,
      patient_name: pat?.full_name ?? '—',
      patient_rm:   pat?.no_rm ?? null,
      package_name: pkg?.name ?? '—',
    }
  })
  return NextResponse.json({ subscriptions })
}

// POST /api/admin/subscriptions — sell a package to a patient. Snapshots
// sessions_total + price_paid from the catalog at purchase time and computes
// expires_at from validity_days, so later catalog edits never rewrite this row.
export async function POST(request: Request) {
  const auth = await requireApiUser({ roles: ['admin'], activeClinic: true })
  if (!auth.ok) return auth.res
  const { db, clinicId } = auth

  const body = await request.json() as { patient_id?: string; package_id?: string }
  if (!body.patient_id || !body.package_id)
    return NextResponse.json({ error: 'Pasien dan paket wajib dipilih' }, { status: 400 })

  if (!(await belongsToClinic(db, 'patients', body.patient_id, clinicId)))
    return NextResponse.json({ error: 'Pasien tidak valid' }, { status: 400 })

  const { data: pkg } = await db
    .from('service_packages')
    .select('num_sessions, price, validity_days, is_active')
    .eq('id', body.package_id)
    .eq('clinic_id', clinicId)
    .maybeSingle()
  if (!pkg) return NextResponse.json({ error: 'Paket tidak ditemukan' }, { status: 400 })
  if (!pkg.is_active) return NextResponse.json({ error: 'Paket sudah tidak aktif' }, { status: 400 })

  const expiresAt = pkg.validity_days
    ? new Date(Date.now() + pkg.validity_days * 86_400_000).toISOString()
    : null

  const { data, error } = await db
    .from('patient_package_subscriptions')
    .insert({
      clinic_id:          clinicId,
      patient_id:         body.patient_id,
      package_id:         body.package_id,
      sessions_total:     pkg.num_sessions,
      sessions_remaining: pkg.num_sessions,
      price_paid:         pkg.price,
      expires_at:         expiresAt,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ subscription: data }, { status: 201 })
}
