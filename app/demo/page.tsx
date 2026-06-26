'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Loader2, Stethoscope, ClipboardList, Users, UserRound, ArrowRight } from 'lucide-react'

const ROLES = [
  {
    role       : 'admin',
    label      : 'Admin Klinik',
    Icon       : Stethoscope,
    description: 'Kelola pasien, jadwal dokter, billing, dan laporan klinik',
    color      : 'bg-blue-50 text-blue-600 border-blue-100',
    iconBg     : 'bg-blue-100',
  },
  {
    role       : 'doctor',
    label      : 'Dokter',
    Icon       : UserRound,
    description: 'Lihat antrian, buat rekam medis dan resep untuk pasien',
    color      : 'bg-green-50 text-green-700 border-green-100',
    iconBg     : 'bg-green-100',
  },
  {
    role       : 'receptionist',
    label      : 'Resepsionis',
    Icon       : ClipboardList,
    description: 'Check-in pasien, kelola antrian, dispensing obat & billing',
    color      : 'bg-violet-50 text-violet-700 border-violet-100',
    iconBg     : 'bg-violet-100',
  },
  {
    role       : 'patient',
    label      : 'Pasien',
    Icon       : Users,
    description: 'Buat appointment online dan lihat riwayat kunjungan & rekam medis',
    color      : 'bg-orange-50 text-orange-700 border-orange-100',
    iconBg     : 'bg-orange-100',
  },
] as const

type DemoRole = typeof ROLES[number]['role']

export default function DemoHubPage() {
  const [loading, setLoading] = useState<DemoRole | null>(null)
  const [error,   setError]   = useState('')

  async function handleSelect(role: DemoRole) {
    setLoading(role)
    setError('')
    try {
      const res  = await fetch('/api/demo-switch', {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({ role }),
      })
      const data = await res.json() as { success?: boolean; redirectTo?: string; error?: string }
      if (data.success && data.redirectTo) {
        window.location.href = data.redirectTo
      } else {
        setError(data.error ?? 'Gagal menyiapkan demo. Coba lagi.')
        setLoading(null)
      }
    } catch {
      setError('Koneksi gagal. Coba lagi.')
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-6 relative overflow-hidden">

      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-100/40 rounded-full blur-3xl -mr-64 -mt-64 opacity-50 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-100/30 rounded-full blur-3xl -ml-32 -mb-32 opacity-40 pointer-events-none" />

      <div className="w-full max-w-[520px] relative z-10 animate-fade-in">

        {/* Header */}
        <div className="text-center mb-10">
          <Link href="/auth/login" className="inline-flex items-center gap-3 group mb-4">
            <Image src="/images/Icon.png" alt="Webzoka" width={48} height={48}
              className="w-12 h-12 object-contain drop-shadow-sm group-hover:scale-105 transition-transform" priority />
            <div className="text-left">
              <h1 className="text-2xl sf-display-heavy tracking-tight text-[#1D1D1F] leading-none">Webzoka</h1>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-1">Clinic Platform</p>
            </div>
          </Link>
          <p className="text-[12px] font-bold text-green-600 uppercase tracking-widest flex items-center justify-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
            Mode Demo Aktif
          </p>
          <h2 className="text-3xl sf-display-heavy tracking-tight text-[#1D1D1F] mt-2">Pilih Role Preview</h2>
          <p className="text-gray-500 text-sm mt-2">Eksplorasi setiap peran tanpa perlu membuat akun.</p>
        </div>

        {/* Role Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {ROLES.map(({ role, label, Icon, description, color, iconBg }) => {
            const isLoading = loading === role
            const isDisabled = loading !== null

            return (
              <button
                key={role}
                onClick={() => handleSelect(role)}
                disabled={isDisabled}
                className={`group relative text-left bg-white rounded-[24px] p-6 apple-shadow border transition-all duration-200
                  ${isDisabled ? 'opacity-60 cursor-not-allowed' : 'hover:scale-[1.02] hover:apple-shadow-hover cursor-pointer border-black/[0.03]'}
                  ${isLoading ? 'ring-2 ring-[#0071E3]/30' : ''}
                `}
              >
                <div className={`w-11 h-11 rounded-2xl ${iconBg} flex items-center justify-center mb-4 transition-transform group-hover:scale-110`}>
                  <Icon size={20} className={color.split(' ')[1]} />
                </div>
                <p className="sf-display-heavy text-[17px] text-[#1D1D1F] mb-1">{label}</p>
                <p className="text-[13px] text-gray-500 leading-relaxed mb-4">{description}</p>
                <div className={`inline-flex items-center gap-1.5 text-[12px] font-bold px-3 py-1.5 rounded-full border ${color}`}>
                  {isLoading ? (
                    <><Loader2 size={12} className="animate-spin" /> Menyiapkan...</>
                  ) : (
                    <>Preview <ArrowRight size={12} /></>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {error && (
          <div className="mt-4 px-4 py-3 bg-red-50 border border-red-100 rounded-2xl text-sm text-red-600 font-medium text-center">
            {error}
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center space-y-2">
          <p className="text-sm text-gray-500">
            Sudah punya akun?{' '}
            <Link href="/auth/login" className="font-bold text-apple-blue hover:underline">Masuk →</Link>
          </p>
          <p className="text-sm text-gray-500">
            Belum punya sistem?{' '}
            <Link href="/register" className="font-bold text-apple-blue hover:underline">Coba Gratis 14 Hari →</Link>
          </p>
          <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mt-4">
            © {new Date().getFullYear()} Webzoka
          </p>
        </div>

      </div>
    </div>
  )
}
