'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { PortalRegisterCard, type RegisterData } from '@/components/auth/PortalRegisterCard'

// Core enum (dari CTA pricing) → nama tampilan, konsisten dgn spec baku Webzoka.
const PLAN_LABEL: Record<string, string> = { starter: 'Starter', pro: 'Growth', enterprise: 'Pro' }

// Slug klinik dari nama bisnis — cerminan validasi server (/api/register).
const RESERVED = new Set(['demo-clinic', 'admin', 'api', 'auth', 'register', 'superadmin', 'login', 'logout', 'www'])

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .replace(/^-|-$/g, '')
}

function RegisterForm() {
  const searchParams = useSearchParams()
  // Dari CTA "Pilih paket" di pricing (intent=subscribe&tier=<coreTier>). Setelah
  // daftar, server sudah auto-login lalu kita arahkan LANGSUNG ke Midtrans untuk tier itu.
  const subscribe = searchParams.get('intent') === 'subscribe'
  const tier = searchParams.get('tier') // Core enum: starter|pro|enterprise
  const period = searchParams.get('period') === 'yearly' ? 'yearly' : 'monthly'
  const planLabel = (tier && PLAN_LABEL[tier]) || undefined
  // Mode langganan aktif hanya bila intent=subscribe DAN tier valid dikenali.
  const subscribing = subscribe && !!planLabel
  const loginHref = '/auth/login'

  async function handleRegister(data: RegisterData): Promise<{ error?: string } | void> {
    // Slug + reserved divalidasi di sini (provisioning klinik); card hanya validasi field umum.
    const slug = generateSlug(data.businessName)
    if (!slug || slug.length < 3) return { error: 'Nama bisnis terlalu pendek (min 3 karakter)' }
    if (RESERVED.has(slug)) return { error: 'Nama bisnis ini tidak bisa digunakan, coba nama lain' }

    // Konfirmasi password TIDAK dikirim ke API (validasi klien sudah di card).
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clinicName: data.businessName,
        slug,
        phone: data.whatsapp,
        adminName: data.adminName,
        email: data.email,
        password: data.password,
      }),
    })
    const body = await res.json().catch(() => ({})) as { success?: boolean; error?: string; redirectTo?: string }

    if (!res.ok || !body.success) {
      return { error: body.error ?? 'Registrasi gagal. Coba lagi.' }
    }

    // Server sudah membuat akun + trial 14 hari DAN auto-login (cookie sesi ter-set).
    if (subscribe && tier) {
      // Paket berbayar dipilih di pricing → langsung ke Midtrans untuk tier itu.
      window.location.assign(`/api/billing/checkout?tier=${encodeURIComponent(tier)}&period=${period}`)
      return
    }
    // Trial / tanpa tier → dashboard (server mengembalikan redirectTo '/admin').
    window.location.assign(body.redirectTo ?? '/admin')
  }

  return (
    <PortalRegisterCard
      subLabel="KLINIK PORTAL"
      portalLabel="Webzoka Klinik"
      subscribe={subscribing}
      planLabel={planLabel}
      loginHref={loginHref}
      onSubmit={handleRegister}
    />
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-slate-400 text-sm">Memuat…</div>}>
      <RegisterForm />
    </Suspense>
  )
}
