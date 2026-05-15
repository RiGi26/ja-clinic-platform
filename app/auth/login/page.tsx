'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react'

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
    <div className="min-h-screen bg-[#F0F9FF] flex">

      {/* ── Left: Branding ───────────────────────────────── */}
      <div
        className="hidden lg:flex flex-col justify-between w-[52%] relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #0A2342, #0C3A6B)' }}
      >
        {/* Subtle bg circle */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[500px] h-[500px] rounded-full bg-cyan-500/[0.05]" />
        </div>

        {/* Logo */}
        <div className="relative z-10 px-10 pt-8">
          <a
            href="/lms-landing"
            className="group inline-flex items-center gap-2 w-fit"
            title="Kembali ke halaman utama"
          >
            <Image
              src="/images/logo-dark.png"
              alt="Japan Arena Corp"
              width={280} height={84}
              className="w-[220px] h-auto object-contain"
              priority
            />
            <span className="opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-[-6px] group-hover:translate-x-0 text-white/50 text-xs font-medium whitespace-nowrap">
              ← Beranda
            </span>
          </a>
        </div>

        {/* Main copy */}
        <div className="relative z-10 px-10 pb-6">
          <h1 className="text-4xl font-black text-white leading-tight tracking-tight mb-4">
            Portal Manajemen<br />Klinik Anda
          </h1>
          <p className="text-white/60 text-base mb-8 leading-relaxed">
            Kelola pasien, jadwal dokter, dan laporan klinik
            dalam satu platform yang mudah digunakan.
          </p>

          <div className="space-y-3">
            {[
              { emoji: '📅', text: 'Jadwal appointment & antrian digital'     },
              { emoji: '📋', text: 'Rekam medis terpusat & mudah diakses'     },
              { emoji: '📲', text: 'Notifikasi WA otomatis ke pasien'          },
              { emoji: '📊', text: 'Laporan keuangan & billing otomatis'       },
            ].map(f => (
              <div key={f.emoji} className="flex items-center gap-3">
                <span className="text-xl flex-shrink-0">{f.emoji}</span>
                <span className="text-white/75 text-sm font-semibold">{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 p-10 pt-6">
          <p className="text-white/40 text-sm font-medium">
            Clinic Platform · by Japan Arena Corp
          </p>
        </div>
      </div>

      {/* ── Right: Form ──────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <a href="/lms-landing" className="flex items-center gap-2 mb-8 lg:hidden group">
            <Image
              src="/images/Icon.png"
              alt="Japan Arena Corp"
              width={40} height={40}
              className="w-10 h-auto object-contain"
            />
            <span className="text-xs text-gray-400 group-hover:text-[#0891B2] transition-colors duration-150 font-medium">
              ← Beranda
            </span>
          </a>

          {/* Card */}
          <div
            className="bg-white rounded-[24px] p-8 border border-gray-100"
            style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.10)' }}
          >
            <h2 className="text-2xl font-black text-[#0C2340] tracking-tight mb-1">Selamat Datang 👋</h2>
            <p className="text-gray-400 text-sm mb-7">
              Login dengan akun yang telah didaftarkan
            </p>

            {error && (
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl p-4 mb-5">
                <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="email@klinik.com"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm text-[#0C2340] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0891B2] focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm text-[#0C2340] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0891B2] focus:border-transparent transition-all pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-2xl text-white font-black text-sm tracking-tight transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                style={{
                  background  : 'linear-gradient(135deg, #0A2342 0%, #0891B2 100%)',
                  boxShadow   : '0 4px 20px rgba(8,145,178,0.35)',
                }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 size={16} className="animate-spin" /> Memproses...
                  </span>
                ) : (
                  '🏥 Masuk ke Portal'
                )}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-gray-100 text-center">
              <p className="text-sm text-gray-400">
                Akun bermasalah?{' '}
                <a
                  href="https://wa.me/6281296917963"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-[#0891B2] hover:underline"
                >
                  Hubungi Admin WA 💬
                </a>
              </p>
            </div>
          </div>

          <p className="text-center text-xs text-gray-400 mt-5">
            © {new Date().getFullYear()} Japan Arena Corp · Clinic Platform
          </p>
        </div>
      </div>

    </div>
  )
}
