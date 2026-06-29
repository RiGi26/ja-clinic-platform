'use client'

import { PortalLoginCard } from '@/components/auth/PortalLoginCard'

export default function LoginPage() {
  async function onSubmit(email: string, password: string) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()

    if (!res.ok) {
      return { error: data.error ?? 'Email atau password salah.' }
    }

    window.location.href = data.redirectTo ?? '/admin'
  }

  return (
    <PortalLoginCard
      subLabel="KLINIK PORTAL"
      portalLabel="Webzoka Klinik"
      onSubmit={onSubmit}
      demo={{ href: '/demo' }}
    />
  )
}
