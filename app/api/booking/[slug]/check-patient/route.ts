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

  // Privasi (audit 2026-07-05): endpoint publik tanpa auth — JANGAN kembalikan nama
  // pasien. Sebelumnya `name` dibalas untuk siapa pun yang tahu slug booking + no HP,
  // memungkinkan pemanenan PII dan pengaitan no HP ke pasien sebuah klinik. Cukup
  // boolean untuk pre-fill "nomor dikenali"; nama tetap diisi manual oleh pasien.
  const { data: patient } = await db
    .from('patients')
    .select('id')
    .eq('clinic_id', link.clinic_id)
    .eq('phone', phone)
    .maybeSingle()

  return NextResponse.json({ found: !!patient })
}
