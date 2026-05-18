import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const DOMAIN_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/

async function requireSuperAdmin(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const db = createAdminClient()
  const { data } = await db.from('users').select('role').eq('id', user.id).single()
  return data?.role === 'superadmin' ? user.id : null
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireSuperAdmin()
  if (!userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const body = await request.json() as { custom_domain?: string | null }
  const { custom_domain } = body

  if (custom_domain === undefined) {
    return NextResponse.json({ error: 'Field custom_domain wajib ada (string atau null)' }, { status: 400 })
  }

  if (custom_domain !== null) {
    if (typeof custom_domain !== 'string' || custom_domain.trim() === '') {
      return NextResponse.json({ error: 'Format domain tidak valid' }, { status: 400 })
    }

    const domain = custom_domain.trim().toLowerCase()

    if (domain.includes('://') || domain.includes('/') || domain.includes(' ')) {
      return NextResponse.json(
        { error: 'Domain tidak boleh mengandung protokol (http://) atau path (/)' },
        { status: 400 },
      )
    }

    if (!DOMAIN_REGEX.test(domain)) {
      return NextResponse.json(
        { error: 'Format domain tidak valid. Contoh: kliniksehat.com' },
        { status: 400 },
      )
    }

    const db = createAdminClient()

    // Cek apakah domain sudah dipakai klinik lain
    const { data: existing } = await db
      .from('clinics')
      .select('id, name')
      .eq('custom_domain', domain)
      .neq('id', id)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: `Domain ini sudah digunakan oleh klinik lain` },
        { status: 409 },
      )
    }

    const { error } = await db
      .from('clinics')
      .update({ custom_domain: domain })
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, custom_domain: domain })
  }

  // custom_domain: null → hapus domain
  const db = createAdminClient()
  const { error } = await db
    .from('clinics')
    .update({ custom_domain: null })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, custom_domain: null })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireSuperAdmin()
  if (!userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const db = createAdminClient()
  const { error } = await db
    .from('clinics')
    .update({ custom_domain: null })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
