import Link from 'next/link'
import { tenantConfig } from '@/lib/tenant-config'

export default function DomainNotFoundPage() {
  const waUrl = `https://wa.me/${tenantConfig.adminPhone}?text=${encodeURIComponent(
    'Halo, saya ingin mendaftarkan custom domain klinik saya ke platform Japan Arena Clinic.',
  )}`

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'linear-gradient(145deg, #0A2342, #0C3A6B)' }}
    >
      <div className="w-full max-w-md text-center">
        {/* Icon */}
        <div className="w-20 h-20 rounded-3xl bg-white/10 border border-white/20 flex items-center justify-center mx-auto mb-8 text-4xl">
          🔍
        </div>

        {/* Heading */}
        <h1 className="text-3xl font-black text-white mb-3 tracking-tight">
          Domain Tidak Ditemukan
        </h1>
        <p className="text-white/60 text-base leading-relaxed mb-2">
          Domain ini belum terdaftar di platform kami.
        </p>
        <p className="text-white/40 text-sm leading-relaxed mb-10">
          Jika Anda adalah pemilik klinik, hubungi tim kami untuk
          mendaftarkan domain Anda ke sistem.
        </p>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-4 rounded-2xl text-sm font-black transition-all hover:scale-[1.02] text-white"
            style={{
              background: '#25D366',
              boxShadow: '0 4px 20px rgba(37,211,102,0.35)',
            }}
          >
            💬 Hubungi Support via WhatsApp
          </a>

          <Link
            href="https://ja-clinic-platform.vercel.app/auth/login"
            className="w-full py-4 rounded-2xl text-sm font-black border border-white/20 text-white/80 hover:bg-white/10 transition-all"
          >
            Login via Platform Utama →
          </Link>
        </div>

        <p className="text-white/30 text-xs mt-8">
          Japan Arena Corp · Clinic Platform
        </p>
      </div>
    </div>
  )
}
