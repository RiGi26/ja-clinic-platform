import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getOrCreateDemoClinic, seedDemoData } from '@/lib/demo-clinic-seed'

export const dynamic = 'force-dynamic'

// Legacy admin-only demo entry — superseded by /api/demo-switch (4 roles), but
// kept routable (never deleted) in case old bookmarks/cached pages still POST
// here. Same demo admin account as demo-switch's 'admin' role, so once that
// flow has run once the sign-in-first path below succeeds on the first try.
const DEMO_EMAIL = 'demo-admin@klinik-platform.com'
const DEMO_PASS  = 'demo-klinik-2026'

export async function POST() {
  try {
    const supabase = await createClient()

    // Warm path: account already provisioned (true once /demo has been hit by
    // anyone, admin or otherwise) → one auth round trip.
    const { error: firstAttempt } = await supabase.auth.signInWithPassword({
      email: DEMO_EMAIL, password: DEMO_PASS,
    })
    if (!firstAttempt) {
      return NextResponse.json({ success: true, redirectTo: '/admin' })
    }

    // Cold path: account missing/broken → provision from scratch (old logic,
    // minus the blocking seed — seeding never blocks the response now).
    const db = createAdminClient()

    const clinicId = await getOrCreateDemoClinic(db)
    if (!clinicId) {
      return NextResponse.json({ error: 'Gagal membuat data klinik demo. Pastikan schema.sql sudah dijalankan.' }, { status: 500 })
    }

    const { data: existingProfile } = await db.from('users').select('id').eq('email', DEMO_EMAIL).maybeSingle()
    let userId: string

    if (existingProfile?.id) {
      userId = existingProfile.id
    } else {
      const { data: newAuth, error: authErr } = await db.auth.admin.createUser({
        email: DEMO_EMAIL, password: DEMO_PASS, email_confirm: true,
      })
      if (authErr || !newAuth?.user) {
        return NextResponse.json({ error: 'Gagal buat akun demo: ' + authErr?.message }, { status: 500 })
      }
      userId = newAuth.user.id
    }

    const { error: upsertErr } = await db.from('users').upsert({
      id       : userId,
      email    : DEMO_EMAIL,
      full_name: 'Admin Demo Klinik',
      role     : 'admin',
      status   : 'active',
      clinic_id: clinicId,
    }, { onConflict: 'id' })

    if (upsertErr) {
      console.error('[demo-clinic-login] upsert users error:', upsertErr.message)
      return NextResponse.json({ error: 'Gagal simpan profil: ' + upsertErr.message }, { status: 500 })
    }

    // Seed fire-and-forget — never block the response (was `await` before).
    void seedDemoData(db, clinicId).catch(e =>
      console.error('[demo-clinic-login] seed error (non-fatal):', e)
    )

    const { error: retryErr } = await supabase.auth.signInWithPassword({
      email: DEMO_EMAIL, password: DEMO_PASS,
    })
    if (retryErr) {
      return NextResponse.json({ error: 'Gagal login: ' + retryErr.message }, { status: 401 })
    }

    return NextResponse.json({ success: true, redirectTo: '/admin' })

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[demo-clinic-login] unexpected error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
