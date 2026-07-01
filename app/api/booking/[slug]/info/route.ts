import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const db = createAdminClient()

  const { data: link } = await db
    .from('booking_links')
    .select('clinic_id, is_active, clinics(id, name, address, phone, logo_url)')
    .eq('slug', slug)
    .single()

  if (!link || !link.is_active) {
    return NextResponse.json({ error: 'Link tidak aktif' }, { status: 404 })
  }

  const clinic = link.clinics as any

  const [{ data: doctors }, { data: locations }] = await Promise.all([
    db
      .from('doctors')
      .select('id, full_name, specialty, location_id')
      .eq('clinic_id', link.clinic_id)
      .eq('is_active', true)
      .order('full_name'),
    // Active branches only — booking offers a branch step when a clinic has >1.
    db
      .from('locations')
      .select('id, name, address')
      .eq('clinic_id', link.clinic_id)
      .eq('is_active', true)
      .order('created_at', { ascending: true }),
  ])

  return NextResponse.json({ clinic, doctors: doctors ?? [], locations: locations ?? [] })
}
