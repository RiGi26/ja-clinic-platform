/**
 * Script untuk membuat akun superadmin pertama.
 * Jalankan dengan: npx ts-node scripts/create-superadmin.ts
 *
 * Set environment variables sebelum menjalankan:
 *   $env:NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
 *   $env:SUPABASE_SERVICE_ROLE_KEY="eyJ..."
 *   $env:SUPERADMIN_EMAIL="superadmin@japanarenacorp.com"
 *   $env:SUPERADMIN_PASSWORD="ganti-dengan-password-kuat"
 *   $env:SUPERADMIN_NAME="Super Admin JAC"
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL      = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!
const SUPERADMIN_EMAIL  = process.env.SUPERADMIN_EMAIL    ?? 'superadmin@japanarenacorp.com'
const SUPERADMIN_PASS   = process.env.SUPERADMIN_PASSWORD ?? ''
const SUPERADMIN_NAME   = process.env.SUPERADMIN_NAME     ?? 'Super Admin'

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY wajib diset.')
  process.exit(1)
}

if (!SUPERADMIN_PASS || SUPERADMIN_PASS.length < 8) {
  console.error('❌ SUPERADMIN_PASSWORD wajib diset dan minimal 8 karakter.')
  process.exit(1)
}

const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function main() {
  console.log('🔐 Membuat akun superadmin...')
  console.log('   Email :', SUPERADMIN_EMAIL)
  console.log('   Nama  :', SUPERADMIN_NAME)

  // Cek apakah email sudah ada
  const { data: authList } = await db.auth.admin.listUsers()
  const existing = authList?.users?.find(u => u.email === SUPERADMIN_EMAIL)

  let userId: string

  if (existing) {
    console.log('⚠️  User dengan email ini sudah ada, menggunakan yang existing...')
    userId = existing.id
  } else {
    // Buat user di Supabase Auth
    const { data: newUser, error: authErr } = await db.auth.admin.createUser({
      email:          SUPERADMIN_EMAIL,
      password:       SUPERADMIN_PASS,
      email_confirm:  true,
    })

    if (authErr || !newUser?.user) {
      console.error('❌ Gagal buat auth user:', authErr?.message)
      process.exit(1)
    }

    userId = newUser.user.id
    console.log('✅ Auth user dibuat, ID:', userId)
  }

  // Upsert ke tabel users dengan role superadmin
  const { error: upsertErr } = await db.from('users').upsert({
    id:        userId,
    email:     SUPERADMIN_EMAIL,
    full_name: SUPERADMIN_NAME,
    role:      'superadmin',
    status:    'active',
    clinic_id: null,
  }, { onConflict: 'id' })

  if (upsertErr) {
    console.error('❌ Gagal upsert ke tabel users:', upsertErr.message)
    console.error('   Pastikan migration 004_superadmin_role.sql sudah dijalankan!')
    process.exit(1)
  }

  console.log('')
  console.log('🎉 Superadmin berhasil dibuat!')
  console.log('   Email    :', SUPERADMIN_EMAIL)
  console.log('   Password :', SUPERADMIN_PASS)
  console.log('   Login di : /auth/login')
  console.log('   Dashboard: /superadmin')
}

main().catch(err => {
  console.error('❌ Error:', err)
  process.exit(1)
})
