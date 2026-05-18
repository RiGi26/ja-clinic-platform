/**
 * Custom Domain Proxy (Next.js 16 — proxy.ts menggantikan middleware.ts)
 *
 * Cara test lokal (tanpa domain asli):
 * 1. Edit file hosts (C:\Windows\System32\drivers\etc\hosts):
 *    Tambahkan: 127.0.0.1 kliniktest.local
 * 2. Set custom_domain di database:
 *    UPDATE clinics SET custom_domain = 'kliniktest.local' WHERE slug = 'demo-clinic';
 * 3. Buka browser: http://kliniktest.local:3000/admin
 * 4. Proxy akan detect 'kliniktest.local' sebagai custom domain dan inject x-clinic-id
 *
 * CATATAN: Berjalan di Edge Runtime.
 * Gunakan createClient dari @supabase/supabase-js langsung — JANGAN import dari
 * lib/supabase/server.ts karena menggunakan cookies() yang tidak tersedia di Edge.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

function getAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

export async function proxy(request: NextRequest) {
  const hostname = (
    request.headers.get('x-forwarded-host') ??
    request.headers.get('host') ??
    ''
  )
    .split(':')[0]
    .toLowerCase()

  const isPlatformDomain =
    hostname.includes('vercel.app') ||
    hostname.includes('localhost') ||
    hostname === '127.0.0.1' ||
    hostname === ''

  if (isPlatformDomain) {
    return NextResponse.next()
  }

  // Custom domain — cari clinic_id di database
  try {
    const db = getAdminClient()
    const { data: clinic, error } = await db
      .from('clinics')
      .select('id, is_active')
      .eq('custom_domain', hostname)
      .single()

    if (error || !clinic || !clinic.is_active) {
      return NextResponse.redirect(new URL('/domain-not-found', request.url))
    }

    // Inject clinic_id ke header — dibaca di server components via headers()
    const response = NextResponse.next()
    response.headers.set('x-clinic-id', clinic.id as string)
    response.headers.set('x-custom-domain', hostname)
    return response
  } catch {
    // Jika Supabase tidak bisa diakses, redirect ke halaman error
    return NextResponse.redirect(new URL('/domain-not-found', request.url))
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
