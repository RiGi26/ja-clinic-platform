import { Calendar, Activity, FileText, Clock } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default function PatientDashboardPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">

      {/* Appointment ticket */}
      <div
        className="rounded-3xl p-8 text-white shadow-xl"
        style={{ background: 'linear-gradient(135deg, #0891B2, #06B6D4)' }}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest font-bold mb-2 text-cyan-100">
              Appointment Berikutnya
            </p>
            <h2 className="text-3xl font-black mb-5">Check-up Rutin</h2>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Calendar size={18} className="text-cyan-100 flex-shrink-0" />
                <span className="font-bold text-sm">Kamis, 16 Mei 2026</span>
              </div>
              <div className="flex items-center gap-3">
                <Clock size={18} className="text-cyan-100 flex-shrink-0" />
                <span className="font-bold text-sm">10:00 – 10:30 WIB</span>
              </div>
              <div className="flex items-center gap-3">
                <Activity size={18} className="text-cyan-100 flex-shrink-0" />
                <span className="font-bold text-sm">Dr. Sarah Putri — Dokter Umum</span>
              </div>
            </div>
          </div>

          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 text-center flex-shrink-0">
            <p className="text-5xl font-black leading-none mb-1">16</p>
            <p className="text-xs font-bold text-cyan-100 uppercase tracking-widest">MEI</p>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-white/20 flex gap-3">
          <button className="flex-1 bg-white text-primary rounded-xl py-3 font-bold text-sm hover:bg-cyan-50 transition-colors">
            Lihat Detail
          </button>
          <button className="flex-1 bg-white/20 backdrop-blur-sm text-white rounded-xl py-3 font-bold text-sm hover:bg-white/30 transition-colors">
            Reschedule
          </button>
        </div>
      </div>

      {/* Health summary + last visit */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h3 className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-4">
            Ringkasan Kesehatan
          </h3>
          <div className="space-y-3">
            {[
              { label: 'Tekanan Darah', value: '120/80 mmHg', cls: 'text-success' },
              { label: 'Berat Badan',   value: '68 kg',       cls: 'text-primary' },
              { label: 'Tinggi Badan',  value: '172 cm',      cls: 'text-primary' },
              { label: 'Golongan Darah',value: 'O+',          cls: 'text-destructive' },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between">
                <span className="text-sm font-bold text-secondary">{row.label}</span>
                <span className={`text-sm font-bold ${row.cls}`}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h3 className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-4">
            Kunjungan Terakhir
          </h3>
          <p className="text-sm font-black text-secondary mb-0.5">12 Mei 2026</p>
          <p className="text-xs text-muted-foreground mb-4">Dr. Sarah Putri</p>
          <div className="border-t border-gray-100 pt-4">
            <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-2">Diagnosis</p>
            <p className="text-sm font-bold text-secondary mb-3">Pemeriksaan Rutin</p>
            <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-2">Resep</p>
            <div className="flex gap-2 flex-wrap">
              <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold">Vitamin C</span>
              <span className="px-3 py-1 bg-success/10 text-success rounded-full text-xs font-bold">Multivitamin</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href="/patient/booking"
          className="bg-primary text-white rounded-2xl p-6 hover:bg-primary-hover transition-colors group block"
        >
          <div className="flex items-center justify-between">
            <div>
              <Calendar size={28} className="mb-3" />
              <h3 className="text-lg font-black mb-1">Buat Appointment</h3>
              <p className="text-sm text-cyan-100">Jadwalkan kunjungan Anda</p>
            </div>
            <span className="text-3xl group-hover:translate-x-1 transition-transform">→</span>
          </div>
        </Link>

        <Link
          href="/patient/records"
          className="bg-white border border-gray-200 rounded-2xl p-6 hover:border-primary hover:shadow-md transition-all group block"
        >
          <div className="flex items-center justify-between">
            <div>
              <FileText size={28} className="mb-3 text-primary" />
              <h3 className="text-lg font-black text-secondary mb-1">Rekam Medis</h3>
              <p className="text-sm text-muted-foreground">Lihat riwayat kesehatan</p>
            </div>
            <span className="text-3xl text-primary group-hover:translate-x-1 transition-transform">→</span>
          </div>
        </Link>
      </div>

    </div>
  )
}
