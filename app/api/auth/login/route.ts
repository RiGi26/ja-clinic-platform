import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const ROLE_REDIRECT: Record<string, string> = {
  superadmin: '/superadmin',
  admin:      '/admin',
  doctor:     '/doctor',
  patient:    '/patient',
}

export async function POST(request: Request) {
  const { email, password } = await request.json()

  if (!email || !password) {
    return NextResponse.json({ error: 'Email dan password wajib diisi.' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error || !data.user) {
    return NextResponse.json({ error: 'Email atau password salah.' }, { status: 401 })
  }

  // Ambil role dari tabel users
  const db = createAdminClient()
  const { data: profile } = await db
    .from('users')
    .select('role, status, clinic_id')
    .eq('id', data.user.id)
    .single()

  if (!profile || profile.status !== 'active') {
    await supabase.auth.signOut()
    return NextResponse.json({ error: 'Akun tidak aktif.' }, { status: 403 })
  }

  if (profile.role !== 'superadmin' && !profile.clinic_id) {
    await supabase.auth.signOut()
    return NextResponse.json({ error: 'Akun tidak terkonfigurasi.' }, { status: 403 })
  }

  return NextResponse.json({
    success: true,
    redirectTo: ROLE_REDIRECT[profile.role] ?? '/patient',
  })
}
