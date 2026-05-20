import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const { searchParams } = new URL(request.url)
  const phone = searchParams.get('phone')

  if (!phone || phone.length < 8) return NextResponse.json({ found: false })

  const db = createAdminClient()

  const { data: link } = await db
    .from('booking_links')
    .select('clinic_id, is_active')
    .eq('slug', slug)
    .single()

  if (!link?.is_active) return NextResponse.json({ found: false })

  const { data: patient } = await db
    .from('patients')
    .select('full_name')
    .eq('clinic_id', link.clinic_id)
    .eq('phone', phone)
    .single()

  if (patient) return NextResponse.json({ found: true, name: patient.full_name })
  return NextResponse.json({ found: false })
}
