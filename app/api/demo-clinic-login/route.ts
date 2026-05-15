import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { seedDemoClinic } from '@/lib/demo-clinic-seed'

export const dynamic = 'force-dynamic'

const DEMO_EMAIL = 'demo-admin@klinik-platform.com'
const DEMO_PASS  = 'demo-klinik-2026'

export async function POST() {
  try {
    const db = createAdminClient()

    // 1. Cari atau buat user di auth
    let userId: string
    const { data: authList } = await db.auth.admin.listUsers()
    const existUser = authList?.users?.find(u => u.email === DEMO_EMAIL)

    if (existUser) {
      userId = existUser.id
    } else {
      const { data: newAuth, error: authErr } = await db.auth.admin.createUser({
        email: DEMO_EMAIL, password: DEMO_PASS, email_confirm: true,
      })
      if (authErr || !newAuth?.user) {
        console.error('[demo-clinic-login] createUser:', authErr?.message)
        return NextResponse.json({ error: 'Gagal buat akun demo' }, { status: 500 })
      }
      userId = newAuth.user.id
    }

    // 2. Upsert profil ke tabel users (pastikan selalu ada & benar)
    await db.from('users').upsert({
      id       : userId,
      email    : DEMO_EMAIL,
      full_name: 'Admin Demo Klinik',
      role     : 'admin',
      status   : 'active',
      clinic_id: null,        // seed akan update ini
    }, { onConflict: 'id' })

    // 3. Seed data demo (clinic, dokter, pasien, appointment)
    await seedDemoClinic(db, userId)

    // 4. Sign in via cookie-based client
    const supabase = await createClient()
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: DEMO_EMAIL, password: DEMO_PASS,
    })

    if (signInErr) {
      console.error('[demo-clinic-login] signIn:', signInErr.message)
      return NextResponse.json({ error: 'Gagal login demo' }, { status: 401 })
    }

    return NextResponse.json({ success: true, redirectTo: '/admin' })

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[demo-clinic-login] error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
