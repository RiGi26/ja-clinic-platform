'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Eye, EyeOff, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react'

const INPUT_CLS = 'w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-[#0C2340] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0891B2] focus:border-transparent transition-all'

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

export default function RegisterPage() {
  const [clinicName, setClinicName] = useState('')
  const [phone,      setPhone]      = useState('')
  const [adminName,   setAdminName]   = useState('')
  const [email,       setEmail]       = useState('')
  const [password,    setPassword]    = useState('')
  const [confirm,     setConfirm]     = useState('')
  const [showPw,      setShowPw]      = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [agreed,      setAgreed]      = useState(false)

  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [success, setSuccess] = useState(false)

  // Subscribe intent from the pricing page (?intent=subscribe&tier=<coreTier>&period=).
  // Read from the URL on mount (client-only) so a paid signup lands straight in
  // checkout instead of the trial success card. tier = Core enum (starter|pro|enterprise).
  const [subscribe, setSubscribe] = useState(false)
  const [tier,      setTier]      = useState<string | null>(null)
  const [period,    setPeriod]    = useState<'monthly' | 'yearly'>('monthly')
  useEffect(() => {
    const q = new URLSearchParams(window.location.search)
    setSubscribe(q.get('intent') === 'subscribe')
    const t = q.get('tier')
    if (t) setTier(t)
    if (q.get('period') === 'yearly') setPeriod('yearly')
  }, [])

  // Core enum tier → display label (Growth/Pro) for the subscribe copy.
  const tierLabel = tier === 'enterprise' ? 'Pro' : tier === 'pro' ? 'Growth' : tier === 'starter' ? 'Starter' : null
  const subscribing = subscribe && !!tierLabel

  const slug = generateSlug(clinicName)

  function validate(): string {
    if (!clinicName.trim()) return 'Nama bisnis wajib diisi'
    if (!slug || slug.length < 3) return 'Nama bisnis terlalu pendek (min 3 karakter)'
    if (RESERVED.has(slug)) return 'Nama bisnis ini tidak bisa digunakan, coba nama lain'
    if (!adminName.trim())    return 'Nama admin wajib diisi'
    if (!email.trim())        return 'Email wajib diisi'
    if (password.length < 8)  return 'Password minimal 8 karakter'
    if (password !== confirm)  return 'Konfirmasi password tidak cocok'
    if (!agreed)              return 'Anda harus menyetujui syarat & ketentuan'
    return ''
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const err = validate()
    if (err) { setError(err); return }

    setError('')
    setLoading(true)

    try {
      const res  = await fetch('/api/register', {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({ clinicName, slug, phone, adminName, email, password }),
      })
      const data = await res.json() as { success?: boolean; error?: string; redirectTo?: string }

      if (!res.ok || !data.success) {
        setError(data.error ?? 'Registrasi gagal. Coba lagi.')
        setLoading(false)
        return
      }

      // Paid signup → go straight to Midtrans checkout for the chosen tier
      // (the API already auto-logged the admin in, so the session cookie is set).
      // Keep `loading` true while the browser navigates away.
      if (subscribe && tier) {
        window.location.assign(`/api/billing/checkout?tier=${encodeURIComponent(tier)}&period=${period}`)
        return
      }

      setSuccess(true)
    } catch {
      setError('Koneksi gagal. Periksa internet Anda dan coba lagi.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F0F9FF] flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">

          {/* Wordmark */}
          <div className="text-center mb-6">
            <img src="/logo-rocket.png" alt="Logo Webzoka" className="mx-auto h-14 w-14 object-contain" />
          </div>

          {success ? (

            /* ── SUCCESS STATE ──────────────────────────── */
            <div className="bg-white rounded-2xl p-10 text-center border border-gray-100" style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.10)' }}>
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 size={32} className="text-emerald-600" />
              </div>
              <h2 className="text-2xl font-black text-[#0C2340] mb-2">Bisnis Anda sudah aktif! 🎉</h2>
              <p className="text-gray-400 text-sm mb-8 leading-relaxed">
                Silakan login dengan email yang baru saja Anda daftarkan.
              </p>
              <Link
                href="/auth/login"
                className="block w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm text-center transition-colors"
              >
                Masuk ke Dashboard →
              </Link>
              <p className="text-xs text-gray-400 mt-4">
                Butuh bantuan setup?{' '}
                <a
                  href="https://wa.me/6281296917963"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-[#0891B2] hover:underline"
                >
                  Chat kami via WA →
                </a>
              </p>
            </div>

          ) : (

            /* ── FORM CARD ──────────────────────────────── */
            <div className="bg-white rounded-2xl p-6 border border-gray-100" style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.10)' }}>

              {/* Badge + Heading */}
              <div className="mb-4">
                {!subscribing && (
                  <span className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-full mb-3">
                    ✨ Gratis 14 hari — tanpa kartu kredit
                  </span>
                )}
                <h2 className="text-xl font-black text-[#0C2340] mb-0.5">
                  {subscribing ? `Berlangganan ${tierLabel}` : 'Daftar & Mulai Trial'}
                </h2>
                <p className="text-xs text-gray-400">
                  {subscribing
                    ? 'Isi data bisnis, lalu lanjut ke pembayaran'
                    : 'Isi data bisnis, akun langsung aktif.'}
                </p>
                {subscribing && (
                  <p className="mt-3 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700">
                    Belum siap bayar? Akun tetap mendapat trial 14 hari.
                  </p>
                )}
              </div>

              {error && (
                <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
                  <AlertCircle size={15} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Nama Bisnis *</label>
                  <input
                    value={clinicName}
                    onChange={e => { setClinicName(e.target.value); setError('') }}
                    placeholder="Contoh: Bakso Tini Japan"
                    className={INPUT_CLS}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Nama Admin / PIC *</label>
                  <input value={adminName} onChange={e => setAdminName(e.target.value)} placeholder="Nama lengkap Anda" className={INPUT_CLS} />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Email *</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@bisnis.jp" className={INPUT_CLS} autoComplete="email" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">No. WhatsApp (opsional)</label>
                  <input
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="62812xxxxxxx"
                    className={INPUT_CLS}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Password *</label>
                  <div className="relative">
                    <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                      placeholder="Minimal 8 karakter" className={`${INPUT_CLS} pr-12`} autoComplete="new-password" />
                    <button type="button" onClick={() => setShowPw(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                      {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Konfirmasi Password *</label>
                  <div className="relative">
                    <input type={showConfirm ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)}
                      placeholder="Ulangi password" className={`${INPUT_CLS} pr-12`} autoComplete="new-password" />
                    <button type="button" onClick={() => setShowConfirm(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                      {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {confirm && password !== confirm && (
                    <p className="text-xs text-red-500 mt-1 font-medium">Password tidak cocok</p>
                  )}
                </div>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-[#0891B2] flex-shrink-0" />
                  <span className="text-xs text-gray-500">
                    Saya setuju dengan{' '}
                    <span className="text-[#0891B2] font-bold">syarat &amp; ketentuan</span>{' '}
                    penggunaan Webzoka.
                  </span>
                </label>

                <button type="submit" disabled={loading}
                  className="w-full py-3 rounded-xl text-white font-black text-sm disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
                  style={{ background: 'linear-gradient(135deg, #0A2342 0%, #0891B2 100%)', boxShadow: '0 4px 20px rgba(8,145,178,0.35)' }}>
                  {loading
                    ? <><Loader2 size={16} className="animate-spin" /> Memproses...</>
                    : subscribing ? 'Daftar & Lanjut Bayar →' : 'Daftarkan Bisnis 🚀'}
                </button>
              </form>

              <div className="mt-3 pt-3 border-t border-gray-100 text-center">
                <p className="text-xs text-gray-400">
                  Sudah punya akun?{' '}
                  <Link href="/auth/login" className="font-bold text-[#0891B2] hover:underline">
                    Masuk di sini →
                  </Link>
                </p>
              </div>
            </div>
          )}

          <p className="text-center text-xs text-gray-400 mt-4">
            © {new Date().getFullYear()} Webzoka
          </p>
        </div>

    </div>
  )
}
