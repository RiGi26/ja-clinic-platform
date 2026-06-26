import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { guardEntitlementApi } from '@/lib/clinic-entitlements'

export const dynamic = 'force-dynamic'

async function getAdminClinicId() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const db = createAdminClient()
  const { data } = await db.from('users').select('clinic_id, role').eq('id', user.id).single()
  if (!data?.clinic_id || data.role !== 'admin') return null
  return data.clinic_id as string
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50)
}

export async function GET() {
  const clinicId = await getAdminClinicId()
  if (!clinicId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const gate = await guardEntitlementApi(clinicId, 'booking_link'); if (gate) return gate

  const db = createAdminClient()
  const { data } = await db.from('booking_links').select('id, slug, is_active').eq('clinic_id', clinicId).single()
  return NextResponse.json({ link: data ?? null })
}

export async function POST(request: Request) {
  const clinicId = await getAdminClinicId()
  if (!clinicId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const gate = await guardEntitlementApi(clinicId, 'booking_link'); if (gate) return gate

  const body = await request.json() as { action: 'generate' | 'toggle'; is_active?: boolean }
  const db   = createAdminClient()

  if (body.action === 'generate') {
    const { data: clinic } = await db.from('clinics').select('name').eq('id', clinicId).single()
    if (!clinic) return NextResponse.json({ error: 'Clinic not found' }, { status: 404 })

    const base = slugify(clinic.name)
    let slug = base; let n = 0
    while (true) {
      const { data: conflict } = await db.from('booking_links').select('id').eq('slug', slug).neq('clinic_id', clinicId).single()
      if (!conflict) break
      slug = `${base}-${++n}`
    }

    const { data, error } = await db.from('booking_links').upsert(
      { clinic_id: clinicId, slug, is_active: true },
      { onConflict: 'clinic_id' }
    ).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ link: data })
  }

  if (body.action === 'toggle') {
    const { data, error } = await db.from('booking_links')
      .update({ is_active: body.is_active })
      .eq('clinic_id', clinicId)
      .select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ link: data })
  }

  return NextResponse.json({ error: 'Action tidak valid' }, { status: 400 })
}
