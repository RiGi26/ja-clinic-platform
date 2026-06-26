'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Eye, EyeOff, AlertCircle, Loader2, CheckCircle2, ChevronRight, ChevronLeft, Check } from 'lucide-react'

const INPUT_CLS = 'w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-[#0C2340] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0891B2] focus:border-transparent transition-all'

const RESERVED = new Set(['demo-clinic', 'admin', 'api', 'auth', 'register', 'superadmin', 'login', 'logout', 'www'])

const TRUST_POINTS = [
  'Langsung aktif setelah daftar',
  'Data klinik Anda aman & terenkripsi',
  'Tidak ada kontrak jangka panjang',
  'Support via WhatsApp siap membantu',
]

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
  const [step, setStep] = useState<1 | 2>(1)

  // Step 1
  const [clinicName, setClinicName] = useState('')
  const [phone,      setPhone]      = useState('')
  const [address,    setAddress]    = useState('')

  // Step 2
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

  const slug = generateSlug(clinicName)

  function validateStep1(): string {
    if (!clinicName.trim()) return 'Nama klinik wajib diisi'
    if (!slug || slug.length < 3) return 'Nama klinik terlalu pendek (min 3 karakter)'
    if (RESERVED.has(slug)) return 'Nama klinik ini tidak bisa digunakan, coba nama lain'
    if (!phone.trim()) return 'Nomor telepon wajib diisi'
    return ''
  }

  function validateStep2(): string {
    if (!adminName.trim())    return 'Nama admin wajib diisi'
    if (!email.trim())        return 'Email wajib diisi'
    if (password.length < 8)  return 'Password minimal 8 karakter'
    if (password !== confirm)  return 'Konfirmasi password tidak cocok'
    if (!agreed)              return 'Anda harus menyetujui syarat & ketentuan'
    return ''
  }

  function handleNext() {
    const err = validateStep1()
    if (err) { setError(err); return }
    setError('')
    setStep(2)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const err = validateStep2()
    if (err) { setError(err); return }

    setError('')
    setLoading(true)

    try {
      const res  = await fetch('/api/register', {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({ clinicName, slug, phone, address, adminName, email, password }),
      })
      const data = await res.json() as { success?: boolean; error?: string; redirectTo?: string }

      if (!res.ok || !data.success) {
        setError(data.error ?? 'Registrasi gagal. Coba lagi.')
        setLoading(false)
        return
      }

      setSuccess(true)
    } catch {
      setError('Koneksi gagal. Periksa internet Anda dan coba lagi.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F0F9FF] flex">

      {/* ── Left: Branding ───────────────────────────────── */}
      <div
        className="hidden lg:flex flex-col justify-between w-[52%] relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #0A2342, #0C3A6B)' }}
      >
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[500px] h-[500px] rounded-full bg-cyan-500/[0.05]" />
        </div>

        <div className="relative z-10 px-8 pt-8">
          <Link href="/auth/login" className="group inline-flex items-center gap-2 w-fit">
            <Image
              src="/images/logo-dark.png"
              alt="Webzoka"
              width={280} height={84}
              className="w-[200px] h-auto object-contain"
              priority
            />
            <span className="opacity-0 group-hover:opacity-100 transition-all text-white/50 text-xs font-medium whitespace-nowrap">
              ← Login
            </span>
          </Link>
        </div>

        <div className="relative z-10 px-8 pb-4">
          <h1 className="text-3xl font-black text-white leading-tight tracking-tight mb-3">
            Mulai 14 hari gratis.
          </h1>
          <p className="text-white/60 text-sm mb-5 leading-relaxed">
            Tidak perlu kartu kredit. Setup dalam hitungan menit.
          </p>

          <div className="space-y-2 mb-5">
            {TRUST_POINTS.map(point => (
              <div key={point} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  <Check size={11} className="text-emerald-400" />
                </div>
                <span className="text-white/80 text-sm font-semibold">{point}</span>
              </div>
            ))}
          </div>

          <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-2">
            <span className="text-sm">🔒</span>
            <span className="text-white/70 text-xs font-medium">Digunakan oleh klinik di Indonesia</span>
          </div>
        </div>

        <div className="relative z-10 px-8 pb-6">
          <p className="text-white/40 text-sm font-medium">Clinic Platform · by Japan Arena Corp</p>
        </div>
      </div>

      {/* ── Right: Form ──────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <Link href="/auth/login" className="flex items-center gap-2 mb-6 lg:hidden group">
            <Image src="/images/Icon.png" alt="Webzoka" width={40} height={40} className="w-10 h-auto object-contain" />
            <span className="text-xs text-gray-400 group-hover:text-[#0891B2] transition-colors font-medium">← Login</span>
          </Link>

          {success ? (

            /* ── SUCCESS STATE ──────────────────────────── */
            <div className="bg-white rounded-2xl p-10 text-center border border-gray-100" style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.10)' }}>
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 size={32} className="text-emerald-600" />
              </div>
              <h2 className="text-2xl font-black text-[#0C2340] mb-2">Klinik Anda sudah aktif! 🎉</h2>
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
                <span className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-full mb-3">
                  ✨ Gratis 14 hari — tanpa kartu kredit
                </span>
                <h2 className="text-xl font-black text-[#0C2340] mb-0.5">Daftarkan Klinik Anda</h2>
                <p className="text-xs text-gray-400">Isi data di bawah, klinik Anda langsung aktif.</p>
              </div>

              {/* Step indicator */}
              <div className="flex items-center mb-4">
                <div className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-black transition-all whitespace-nowrap ${
                  step === 1 ? 'bg-blue-600 text-white' : 'bg-emerald-500 text-white'
                }`}>
                  {step > 1
                    ? <Check size={11} className="flex-shrink-0" />
                    : <span>①</span>
                  }
                  Info Klinik
                </div>

                <div className={`flex-1 h-0.5 mx-2 transition-all ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`} />

                <div className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-black transition-all whitespace-nowrap ${
                  step === 2 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'
                }`}>
                  <span>②</span>
                  Akun Admin
                </div>
              </div>

              {/* Step heading */}
              <h3 className="text-lg font-black text-[#0C2340] tracking-tight mb-0.5">
                {step === 1 ? 'Data Klinik 🏥' : 'Akun Admin 👤'}
              </h3>
              <p className="text-xs text-gray-400 mb-4">
                {step === 1 ? 'Isi informasi klinik Anda' : 'Buat akun untuk mengelola klinik'}
              </p>

              {error && (
                <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
                  <AlertCircle size={15} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700">{error}</p>
                </div>
              )}

              {/* Step 1 */}
              {step === 1 && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Nama Klinik *</label>
                    <input
                      value={clinicName}
                      onChange={e => { setClinicName(e.target.value); setError('') }}
                      placeholder="Klinik Sehat Bersama"
                      className={INPUT_CLS}
                    />
                    {slug && (
                      <p className="text-[11px] text-gray-400 mt-1">
                        URL:{' '}
                        <span className={`font-mono font-bold ${RESERVED.has(slug) ? 'text-red-500' : 'text-[#0891B2]'}`}>
                          {slug}.clinic.webzoka.com
                        </span>
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">No. Telepon Klinik *</label>
                    <input
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="08123456789"
                      className={INPUT_CLS}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Alamat Klinik</label>
                    <textarea
                      rows={2}
                      value={address}
                      onChange={e => setAddress(e.target.value)}
                      placeholder="Jl. Sehat No. 1, Kota..."
                      className={`${INPUT_CLS} resize-none`}
                    />
                  </div>
                  <button
                    onClick={handleNext}
                    className="w-full py-3 rounded-xl text-white font-black text-sm flex items-center justify-center gap-2 mt-4"
                    style={{ background: 'linear-gradient(135deg, #0A2342 0%, #0891B2 100%)', boxShadow: '0 4px 20px rgba(8,145,178,0.35)' }}
                  >
                    Lanjut <ChevronRight size={16} />
                  </button>
                </div>
              )}

              {/* Step 2 */}
              {step === 2 && (
                <form onSubmit={handleSubmit} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Nama Lengkap Admin *</label>
                    <input value={adminName} onChange={e => setAdminName(e.target.value)} placeholder="Nama Anda" className={INPUT_CLS} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Email *</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@klinik.com" className={INPUT_CLS} autoComplete="email" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Password * (min 8 karakter)</label>
                    <div className="relative">
                      <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                        placeholder="••••••••" className={`${INPUT_CLS} pr-12`} autoComplete="new-password" />
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
                        placeholder="••••••••" className={`${INPUT_CLS} pr-12`} autoComplete="new-password" />
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
                      <span className="text-[#0891B2] font-bold">syarat & ketentuan</span>{' '}
                      penggunaan platform Webzoka Clinic
                    </span>
                  </label>

                  <div className="flex gap-3 mt-4">
                    <button type="button" onClick={() => { setStep(1); setError('') }}
                      className="flex items-center gap-1.5 px-4 py-3 rounded-xl border border-gray-200 text-secondary text-sm font-bold hover:bg-gray-50 transition-colors">
                      <ChevronLeft size={14} /> Kembali
                    </button>
                    <button type="submit" disabled={loading}
                      className="flex-1 py-3 rounded-xl text-white font-black text-sm disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      style={{ background: 'linear-gradient(135deg, #0A2342 0%, #0891B2 100%)', boxShadow: '0 4px 20px rgba(8,145,178,0.35)' }}>
                      {loading ? <><Loader2 size={16} className="animate-spin" /> Mendaftarkan...</> : 'Daftarkan Klinik 🏥'}
                    </button>
                  </div>
                </form>
              )}

              <div className="mt-3 pt-3 border-t border-gray-100 text-center">
                <p className="text-xs text-gray-400">
                  Sudah punya akun?{' '}
                  <Link href="/auth/login" className="font-bold text-[#0891B2] hover:underline">
                    Login di sini →
                  </Link>
                </p>
              </div>
            </div>
          )}

          <p className="text-center text-xs text-gray-400 mt-4">
            © {new Date().getFullYear()} Webzoka · Clinic Platform
          </p>
        </div>
      </div>

    </div>
  )
}
