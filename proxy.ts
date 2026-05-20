/**
 * Custom Domain Proxy & Auth Middleware (Next.js 16)
 *
 * Menggabungkan deteksi custom domain dan proteksi autentikasi.
 * Berjalan di Edge Runtime.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'

const PROTECTED_PREFIXES = ['/admin', '/doctor', '/receptionist', '/patient', '/superadmin']

function getAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  // ─── 1. Auth Middleware Logic ──────────────────────────────────────────
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const isProtected = PROTECTED_PREFIXES.some(p => request.nextUrl.pathname.startsWith(p))

  if (!user && isProtected) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  // ─── 2. Custom Domain Proxy Logic ──────────────────────────────────────
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
    return supabaseResponse
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

    // Inject clinic_id ke header
    supabaseResponse.headers.set('x-clinic-id', clinic.id as string)
    supabaseResponse.headers.set('x-custom-domain', hostname)
    return supabaseResponse
  } catch {
    return NextResponse.redirect(new URL('/domain-not-found', request.url))
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|public|images|api|booking|auth/login|auth/logout|register|demo).*)',
  ],
}
