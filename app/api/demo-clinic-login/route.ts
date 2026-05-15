import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getOrCreateDemoClinic, seedDemoData } from '@/lib/demo-clinic-seed'

export const dynamic = 'force-dynamic'

const DEMO_EMAIL = 'demo-admin@klinik-platform.com'
const DEMO_PASS  = 'demo-klinik-2026'

export async function POST() {
  try {
    const db = createAdminClient()

    // 1. Buat/cari clinic DULU — dapat clinic_id valid
    const clinicId = await getOrCreateDemoClinic(db)
    if (!clinicId) {
      return NextResponse.json({ error: 'Gagal membuat data klinik demo. Pastikan schema.sql sudah dijalankan.' }, { status: 500 })
    }

    // 2. Cari atau buat user di Supabase Auth
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
        return NextResponse.json({ error: 'Gagal buat akun demo: ' + authErr?.message }, { status: 500 })
      }
      userId = newAuth.user.id
    }

    // 3. Upsert profil user — DENGAN clinic_id yang sudah valid (bukan null)
    const { error: upsertErr } = await db.from('users').upsert({
      id       : userId,
      email    : DEMO_EMAIL,
      full_name: 'Admin Demo Klinik',
      role     : 'admin',
      status   : 'active',
      clinic_id: clinicId,   // ← clinic_id valid, bukan null
    }, { onConflict: 'id' })

    if (upsertErr) {
      console.error('[demo-clinic-login] upsert users error:', upsertErr.message)
      return NextResponse.json({ error: 'Gagal simpan profil: ' + upsertErr.message }, { status: 500 })
    }

    // 4. Seed data (dokter, pasien, appointment, billing)
    await seedDemoData(db, clinicId)

    // 5. Sign in
    const supabase = await createClient()
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: DEMO_EMAIL, password: DEMO_PASS,
    })

    if (signInErr) {
      return NextResponse.json({ error: 'Gagal login: ' + signInErr.message }, { status: 401 })
    }

    return NextResponse.json({ success: true, redirectTo: '/admin' })

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[demo-clinic-login] unexpected error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
