import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getOrCreateDemoClinic, seedDemoData } from '@/lib/demo-clinic-seed'

export const dynamic = 'force-dynamic'

const DEMO_PASS = process.env.DEMO_CLINIC_PASSWORD ?? 'demo-klinik-2026'

const ROLE_CONFIG = {
  admin: {
    email    : process.env.DEMO_CLINIC_ADMIN_EMAIL ?? 'demo-admin@klinik-platform.com',
    name     : 'Admin Demo Klinik',
    redirect : '/admin',
  },
  doctor: {
    email    : process.env.DEMO_CLINIC_DOCTOR_EMAIL ?? 'demo-doctor@klinik-platform.com',
    name     : 'Dr. Demo',
    redirect : '/doctor',
  },
  receptionist: {
    email    : process.env.DEMO_CLINIC_RECEPTIONIST_EMAIL ?? 'demo-resepsionis@klinik-platform.com',
    name     : 'Resepsionis Demo',
    redirect : '/receptionist',
  },
  patient: {
    email    : process.env.DEMO_CLINIC_PATIENT_EMAIL ?? 'demo-pasien@klinik-platform.com',
    name     : 'Pasien Demo',
    redirect : '/patient',
  },
} as const

type DemoRole = keyof typeof ROLE_CONFIG

export async function POST(req: NextRequest) {
  try {
    const { role } = await req.json() as { role: string }

    if (!role || !(role in ROLE_CONFIG)) {
      return NextResponse.json({ error: 'Role tidak valid.' }, { status: 400 })
    }

    const cfg  = ROLE_CONFIG[role as DemoRole]
    const db   = createAdminClient()

    // 1. Pastikan demo clinic ada dan data sudah di-seed
    const clinicId = await getOrCreateDemoClinic(db)
    if (!clinicId) {
      return NextResponse.json({ error: 'Gagal menyiapkan klinik demo.' }, { status: 500 })
    }
    await seedDemoData(db, clinicId)

    // 2. Cari atau buat auth user untuk role ini
    const { data: authList } = await db.auth.admin.listUsers()
    const existAuth = authList?.users?.find(u => u.email === cfg.email)

    let userId: string
    if (existAuth) {
      userId = existAuth.id
    } else {
      const { data: newAuth, error: authErr } = await db.auth.admin.createUser({
        email: cfg.email, password: DEMO_PASS, email_confirm: true,
      })
      if (authErr || !newAuth?.user) {
        return NextResponse.json({ error: 'Gagal buat akun demo: ' + authErr?.message }, { status: 500 })
      }
      userId = newAuth.user.id
    }

    // 3. Upsert profil di public.users
    await db.from('users').upsert({
      id        : userId,
      email     : cfg.email,
      full_name : cfg.name,
      role      : role,
      status    : 'active',
      clinic_id : clinicId,
    }, { onConflict: 'id' })

    // 4. Setup role-specific records (idempotent)
    if (role === 'doctor') {
      const { data: existDoc } = await db.from('doctors')
        .select('id').eq('clinic_id', clinicId).eq('user_id', userId).maybeSingle()
      if (!existDoc) {
        await db.from('doctors').insert({
          clinic_id: clinicId, user_id: userId,
          full_name: cfg.name, specialty: 'Dokter Umum',
          consultation_fee: 150000, is_active: true,
        })
      }
    }

    if (role === 'patient') {
      const { data: existPat } = await db.from('patients')
        .select('id').eq('clinic_id', clinicId).eq('no_rm', 'RM-DEMO-0099').maybeSingle()
      if (!existPat) {
        await db.from('patients').insert({
          clinic_id: clinicId, no_rm: 'RM-DEMO-0099',
          full_name: cfg.name, phone: '08099999999',
          gender: 'male', blood_type: 'O+', date_of_birth: '1995-01-01',
        })
      }
    }

    // 5. Sign in
    const supabase = await createClient()
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: cfg.email, password: DEMO_PASS,
    })
    if (signInErr) {
      return NextResponse.json({ error: 'Gagal login: ' + signInErr.message }, { status: 401 })
    }

    return NextResponse.json({ success: true, redirectTo: cfg.redirect })

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[demo-switch]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
