import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const RESERVED = new Set(['demo-clinic', 'admin', 'api', 'auth', 'register', 'superadmin', 'login', 'logout', 'www'])

export async function POST(request: Request) {
  const body = await request.json() as {
    clinicName?: string; slug?: string; phone?: string; address?: string
    adminName?: string; email?: string; password?: string
  }

  const { clinicName, slug, phone, address, adminName, email, password } = body

  // Server-side validation
  if (!clinicName?.trim()) return NextResponse.json({ error: 'Nama klinik wajib diisi' }, { status: 400 })
  if (!slug?.trim() || slug.length < 3) return NextResponse.json({ error: 'Nama klinik terlalu pendek' }, { status: 400 })
  if (RESERVED.has(slug)) return NextResponse.json({ error: 'Nama klinik ini tidak bisa digunakan, coba nama lain' }, { status: 400 })
  if (!phone?.trim()) return NextResponse.json({ error: 'Nomor telepon wajib diisi' }, { status: 400 })
  if (!adminName?.trim()) return NextResponse.json({ error: 'Nama admin wajib diisi' }, { status: 400 })
  if (!email?.trim()) return NextResponse.json({ error: 'Email wajib diisi' }, { status: 400 })
  if (!password || password.length < 8) return NextResponse.json({ error: 'Password minimal 8 karakter' }, { status: 400 })

  const db = createAdminClient()

  // Check slug uniqueness
  const { data: existingClinic } = await db
    .from('clinics')
    .select('id')
    .eq('slug', slug)
    .single()

  if (existingClinic) {
    return NextResponse.json({ error: 'Nama klinik ini sudah terdaftar, coba nama lain' }, { status: 409 })
  }

  // Insert clinic
  const planExpiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()

  const { data: clinic, error: clinicErr } = await db
    .from('clinics')
    .insert({
      name:            clinicName.trim(),
      slug,
      phone:           phone.trim(),
      address:         address?.trim() || null,
      plan:            'trial',
      plan_expires_at: planExpiresAt,
      is_active:       true,
    })
    .select('id')
    .single()

  if (clinicErr || !clinic) {
    return NextResponse.json({ error: 'Gagal mendaftarkan klinik: ' + (clinicErr?.message ?? 'Unknown error') }, { status: 500 })
  }

  // Create auth user — jika email sudah ada, Supabase akan return error
  const { data: authUser, error: authErr } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authErr || !authUser?.user) {
    // Rollback: delete clinic
    await db.from('clinics').delete().eq('id', clinic.id)
    const isEmailTaken = authErr?.message?.toLowerCase().includes('already registered')
      || authErr?.message?.toLowerCase().includes('already exists')
    if (isEmailTaken) {
      return NextResponse.json({ error: 'Email ini sudah terdaftar, silakan login' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Gagal membuat akun: ' + (authErr?.message ?? 'Unknown error') }, { status: 500 })
  }

  // Insert user record
  const { error: userErr } = await db.from('users').insert({
    id:        authUser.user.id,
    clinic_id: clinic.id,
    email:     email.trim(),
    full_name: adminName.trim(),
    role:      'admin',
    status:    'active',
  })

  if (userErr) {
    // Rollback: delete auth user + clinic
    await db.auth.admin.deleteUser(authUser.user.id)
    await db.from('clinics').delete().eq('id', clinic.id)
    return NextResponse.json({ error: 'Gagal menyimpan profil: ' + userErr.message }, { status: 500 })
  }

  // Auto login
  const supabase = await createClient()
  const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password })

  if (signInErr) {
    return NextResponse.json({ error: 'Akun berhasil dibuat tapi gagal login otomatis. Silakan login manual.' }, { status: 500 })
  }

  return NextResponse.json({ success: true, redirectTo: '/admin' })
}
