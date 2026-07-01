import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'
import { provisionCoreTenant } from '@/lib/core-provision'
import { tierFeatures } from '@/lib/entitlements'
import React from 'react'
import WelcomePatient from '@/emails/WelcomePatient'

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
    .select('id, name')
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

  // Provision a matching Core tenant (billing SoR) so checkout/upgrade works later.
  // Best-effort: signup must not depend on Core uptime; reconcile backfills.
  const provision = await provisionCoreTenant({
    slug,
    name: clinic.name,
    email: email.trim(),
    phone: phone?.trim() || null,
    linkedTenantId: clinic.id,
  })
  const coreTenantId = provision.ok ? provision.coreTenantId : null
  if (!provision.ok) {
    console.error('[register] Core provision failed (non-fatal):', provision.error)
  }

  // Seed a 14-day trial entitlement = full Pro features — ONLY when the clinic was
  // provisioned in Core (billing is live). If provision failed (Core/env not ready
  // yet), we deliberately DON'T write a row: the clinic then keeps legacy full
  // access (behaviour-preserving) instead of getting a trial that would expire with
  // no working checkout to renew it. Once Core sync runs, /api/billing/sync fills it.
  if (coreTenantId) {
    const { error: entErr } = await db.from('tenant_entitlements').upsert(
      {
        clinic_id:        clinic.id,
        tier:             'pro',
        entitlements:     tierFeatures('pro'),
        max_active_users: null,
        status:           'trial',
        linked_tenant_id: coreTenantId,
        synced_at:        new Date().toISOString(),
        expires_at:       planExpiresAt,
      },
      { onConflict: 'clinic_id' },
    )
    if (entErr) {
      console.error('[register] trial entitlement upsert failed (non-fatal):', entErr.message)
    }
  }

  // Auto login
  const supabase = await createClient()
  const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password })

  if (signInErr) {
    return NextResponse.json({ error: 'Akun berhasil dibuat tapi gagal login otomatis. Silakan login manual.' }, { status: 500 })
  }

  sendEmail({
    to: email.trim(),
    subject: `Selamat! Klinik ${clinic.name} telah terdaftar`,
    react: React.createElement(WelcomePatient, {
      patientName: adminName.trim(),
      clinicName: clinic.name,
      noRM: '-',
      loginUrl: `${process.env.NEXT_PUBLIC_APP_URL}/auth/login`,
    }),
  }).catch(console.error)

  return NextResponse.json({ success: true, redirectTo: '/admin' })
}
