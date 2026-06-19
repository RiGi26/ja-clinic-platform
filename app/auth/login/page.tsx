'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Eye, EyeOff, AlertCircle, Loader2, Sparkles } from 'lucide-react'

// ─── Demo Banner (di bawah login card) ───────────────────────────
function DemoBanner() {
  return (
    <div className="mt-4 bg-white rounded-2xl border border-black/[0.05] px-5 py-4 apple-shadow animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Sparkles size={14} className="text-green-500 flex-shrink-0" />
          <p className="text-[13px] text-gray-500 font-medium">Ingin coba platform dulu tanpa daftar?</p>
        </div>
        <a
          href="/demo"
          className="flex items-center justify-center gap-1.5 px-4 py-2 text-[12px] font-bold text-gray-700 bg-gray-50 hover:bg-gray-100 border border-black/[0.07] rounded-xl transition-all flex-shrink-0"
        >
          Coba Demo →
        </a>
      </div>
    </div>
  )
}

export default function LoginPage() {
  const [email,        setEmail]        = useState('')
  const [password,     setPassword]     = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res  = await fetch('/api/auth/login', {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({ email, password }),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'Email atau password salah.')
      setLoading(false)
      return
    }

    window.location.href = data.redirectTo ?? '/admin'
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-6 relative overflow-hidden">

      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-100/50 rounded-full blur-3xl -mr-64 -mt-64 opacity-60 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-100/30 rounded-full blur-3xl -ml-32 -mb-32 opacity-40 pointer-events-none" />

      <div className="w-full max-w-[440px] relative z-10 animate-fade-in">

        {/* Branding Header */}
        <div className="text-center mb-10 flex flex-col items-center gap-3">
          <img src="/logo-rocket.png" alt="Logo Webzoka" className="h-16 w-16 object-contain" />
          <div className="text-center mt-2">
            <h1 className="text-2xl sf-display-heavy tracking-tight text-gray-900 leading-none">Japan Arena</h1>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-2">Clinic Platform</p>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-[32px] p-8 md:p-10 apple-shadow border border-black/[0.03]">

          {error && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-2xl p-4 mb-6 animate-shake">
              <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1 sf-display">
                Alamat Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="name@clinic.com"
                className="w-full px-4 py-3.5 bg-gray-50/50 border border-black/5 rounded-2xl text-[15px] text-[#1D1D1F] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 focus:bg-white transition-all"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1 sf-display">
                Kata Sandi
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full px-4 py-3.5 bg-gray-50/50 border border-black/5 rounded-2xl text-[15px] text-[#1D1D1F] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 focus:bg-white transition-all pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-[#0071E3] hover:bg-[#005BB5] text-white font-bold rounded-2xl text-[15px] transition-all active:scale-[0.98] disabled:opacity-60 shadow-lg glow-button"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 size={18} className="animate-spin" /> Mengotentikasi...
                  </span>
                ) : (
                  'Login ke Portal Klinik'
                )}
              </button>
            </div>
          </form>

          <div className="mt-8 text-center pt-6 border-t border-black/5">
            <p className="text-sm text-gray-500">
              Butuh bantuan akses?{' '}
              <a href="https://wa.me/6281296917963" target="_blank" rel="noopener noreferrer" className="font-bold text-apple-blue hover:text-blue-700 transition-colors">
                Hubungi Support
              </a>
            </p>
          </div>
        </div>

        {/* Demo Banner — di bawah login card */}
        <DemoBanner />

        <div className="mt-6 text-center space-y-3">
          <p className="text-[12px] text-gray-400 font-medium">
            Belum punya sistem untuk klinik Anda?{' '}
            <a href="/register" className="text-apple-blue font-bold hover:underline">Coba Gratis 14 Hari</a>
          </p>
          <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">
            © {new Date().getFullYear()} Japan Arena Corp
          </p>
        </div>

      </div>
    </div>
  )
}
