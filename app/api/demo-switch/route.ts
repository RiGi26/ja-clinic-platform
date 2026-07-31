import { NextRequest, NextResponse, after } from 'next/server'
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

    const cfg = ROLE_CONFIG[role as DemoRole]
    const db  = createAdminClient()

    // 1+3 in parallel — independent reads: resolving/creating the demo clinic
    // does not depend on whether the demo user already exists, and vice versa.
    const [clinicId, existingProfile] = await Promise.all([
      getOrCreateDemoClinic(db),
      db.from('users').select('id').eq('email', cfg.email).maybeSingle().then(r => r.data),
    ])
    if (!clinicId) {
      return NextResponse.json({ error: 'Gagal menyiapkan klinik demo.' }, { status: 500 })
    }

    // 2+4 in parallel — the doctor-count seed check (needs clinicId) is
    // independent of resolving/creating the auth user (needs existingProfile).
    const [{ count: doctorCount }, userIdResult] = await Promise.all([
      db.from('doctors').select('*', { count: 'exact', head: true }).eq('clinic_id', clinicId),
      existingProfile?.id
        ? Promise.resolve<{ id: string } | { error: string }>({ id: existingProfile.id })
        : db.auth.admin.createUser({ email: cfg.email, password: DEMO_PASS, email_confirm: true })
            .then(({ data, error }) =>
              error || !data?.user
                ? { error: 'Gagal buat akun demo: ' + (error?.message ?? 'unknown') }
                : { id: data.user.id }
            ),
    ])

    if (!doctorCount || doctorCount === 0) {
      // Seed hanya pertama kali — tidak block, biarkan selesai sendiri
      void seedDemoData(db, clinicId).catch(e =>
        console.error('[demo-switch] seed error (non-fatal):', e)
      )
    }

    if ('error' in userIdResult) {
      return NextResponse.json({ error: userIdResult.error }, { status: 500 })
    }
    const userId = userIdResult.id
    const isReturningUser = !!existingProfile?.id

    // 5. Upsert profil. Untuk user yang SUDAH ADA (warm path), baris users
    //    sudah ada sebelum kita mulai — upsert di sini cuma refresh metadata
    //    yang biasanya tak berubah, jadi aman dijalankan after() (non-blocking,
    //    tak menunda role-specific insert/signin). Untuk user BARU (cold path,
    //    baru saja createUser), tetap WAJIB di-await: doctors.user_id adalah
    //    FK NOT NULL ke users(id), insert doctor bisa gagal kalau baris users
    //    belum committed.
    const doUpsert = () => db.from('users').upsert({
      id        : userId,
      email     : cfg.email,
      full_name : cfg.name,
      role      : role,
      status    : 'active',
      clinic_id : clinicId,
    }, { onConflict: 'id' })

    if (isReturningUser) {
      after(async () => {
        const { error } = await doUpsert()
        if (error) console.error('[demo-switch] upsert refresh error (non-fatal):', error.message)
      })
    } else {
      const { error: upsertErr } = await doUpsert()
      if (upsertErr) {
        return NextResponse.json({ error: 'Gagal simpan profil: ' + upsertErr.message }, { status: 500 })
      }
    }

    // 6. Setup role-specific records (idempotent)
    if (role === 'doctor') {
      const { data: existDoc } = await db.from('doctors')
        .select('id').eq('clinic_id', clinicId).eq('user_id', userId).maybeSingle()
      if (!existDoc) {
        // Inherit the clinic's default branch (lookup only — the seed owns creation).
        const { data: defLoc } = await db.from('locations')
          .select('id').eq('clinic_id', clinicId).order('created_at', { ascending: true }).limit(1).maybeSingle()
        await db.from('doctors').insert({
          clinic_id: clinicId, user_id: userId,
          full_name: cfg.name, specialty: 'Dokter Umum',
          consultation_fee: 150000, is_active: true,
          location_id: defLoc?.id ?? null,
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

    // 7. Sign in
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
