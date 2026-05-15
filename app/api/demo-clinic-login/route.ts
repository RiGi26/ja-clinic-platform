import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { seedDemoClinic } from '@/lib/demo-clinic-seed'

export const dynamic = 'force-dynamic'

const DEMO_ADMIN_EMAIL = 'demo-admin@klinik-platform.com'
const DEMO_ADMIN_PASS  = 'demo-klinik-2026'

export async function POST() {
  try {
    const db = createAdminClient()

    // Cari atau buat demo admin user
    let userId: string
    const { data: existAuth } = await db.auth.admin.listUsers()
    const existUser = existAuth?.users.find(u => u.email === DEMO_ADMIN_EMAIL)

    if (existUser) {
      userId = existUser.id
    } else {
      const { data: newAuth, error } = await db.auth.admin.createUser({
        email: DEMO_ADMIN_EMAIL, password: DEMO_ADMIN_PASS, email_confirm: true,
      })
      if (error || !newAuth?.user) return NextResponse.json({ error: 'Gagal buat user demo' }, { status: 500 })
      userId = newAuth.user.id

      await db.from('users').insert({
        id: userId, email: DEMO_ADMIN_EMAIL, full_name: 'Admin Demo Klinik',
        role: 'admin', status: 'active', clinic_id: null,
      })
    }

    // Seed data demo
    await seedDemoClinic(db, userId)

    // Sign in
    const supabase = await createClient()
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: DEMO_ADMIN_EMAIL, password: DEMO_ADMIN_PASS,
    })
    if (signInErr) return NextResponse.json({ error: 'Gagal login demo' }, { status: 401 })

    return NextResponse.json({ success: true, redirectTo: '/admin' })
  } catch (err) {
    console.error('[demo-clinic-login]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
