import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

async function requireSuperAdmin(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const db = createAdminClient()
  const { data } = await db.from('users').select('role').eq('id', user.id).single()
  return data?.role === 'superadmin' ? user.id : null
}

export async function GET(request: Request) {
  const userId = await requireSuperAdmin()
  if (!userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search')
  const plan   = searchParams.get('plan')
  const status = searchParams.get('status')

  const db = createAdminClient()
  let query = db
    .from('clinics')
    .select('id, name, slug, phone, email, plan, plan_expires_at, is_active, created_at')
    .order('created_at', { ascending: false })

  if (plan)   query = query.eq('plan', plan)
  if (status === 'active')   query = query.eq('is_active', true)
  if (status === 'inactive') query = query.eq('is_active', false)

  const { data: clinics } = await query

  // Count patients per clinic
  const result = await Promise.all(
    (clinics ?? []).map(async c => {
      const { count } = await db
        .from('patients')
        .select('*', { count: 'exact', head: true })
        .eq('clinic_id', c.id)
      return { ...c, patient_count: count ?? 0 }
    })
  )

  const filtered = search
    ? result.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.slug.toLowerCase().includes(search.toLowerCase())
      )
    : result

  return NextResponse.json({ clinics: filtered })
}

export async function POST(request: Request) {
  const userId = await requireSuperAdmin()
  if (!userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json() as {
    name?: string; slug?: string; admin_email?: string
    admin_password?: string; admin_name?: string; plan?: string
  }

  const { name, slug, admin_email, admin_password, admin_name, plan } = body
  if (!name || !slug || !admin_email || !admin_password || !admin_name) {
    return NextResponse.json({ error: 'Semua field wajib diisi' }, { status: 400 })
  }

  const db = createAdminClient()

  const { data: existing } = await db.from('clinics').select('id').eq('slug', slug).single()
  if (existing) return NextResponse.json({ error: 'Slug sudah dipakai' }, { status: 409 })

  const planExpiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()

  const { data: clinic, error: cErr } = await db.from('clinics').insert({
    name, slug, plan: plan ?? 'trial', plan_expires_at: planExpiresAt, is_active: true,
  }).select('id').single()

  if (cErr || !clinic) return NextResponse.json({ error: cErr?.message ?? 'Gagal buat klinik' }, { status: 500 })

  const { data: authUser, error: aErr } = await db.auth.admin.createUser({
    email: admin_email, password: admin_password, email_confirm: true,
  })

  if (aErr || !authUser?.user) {
    await db.from('clinics').delete().eq('id', clinic.id)
    return NextResponse.json({ error: aErr?.message ?? 'Gagal buat akun' }, { status: 500 })
  }

  const { error: uErr } = await db.from('users').insert({
    id: authUser.user.id, clinic_id: clinic.id,
    email: admin_email, full_name: admin_name, role: 'admin', status: 'active',
  })

  if (uErr) {
    await db.auth.admin.deleteUser(authUser.user.id)
    await db.from('clinics').delete().eq('id', clinic.id)
    return NextResponse.json({ error: uErr.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, clinic_id: clinic.id }, { status: 201 })
}
