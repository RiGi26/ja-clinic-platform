import { getClinicUser } from '@/lib/clinic'
import { createAdminClient } from '@/lib/supabase/server'
import { Users, Calendar, DollarSign, Clock, TrendingUp, Star } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

function fmtRupiah(n: number) {
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1).replace('.0', '')}jt`
  if (n >= 1_000)     return `Rp ${(n / 1_000).toFixed(0)}rb`
  return `Rp ${n.toLocaleString('id-ID')}`
}

const STATUS_STYLE: Record<string, string> = {
  menunggu:  'bg-amber-50   text-amber-600   border-amber-200',
  dipanggil: 'bg-cyan-50    text-cyan-600    border-cyan-200',
  diperiksa: 'bg-blue-50    text-blue-600    border-blue-200',
  selesai:   'bg-emerald-50 text-emerald-600 border-emerald-200',
  batal:     'bg-red-50     text-red-500     border-red-200',
}
const STATUS_LABEL: Record<string, string> = {
  menunggu: 'Menunggu', dipanggil: 'Dipanggil',
  diperiksa: 'Diperiksa', selesai: 'Selesai', batal: 'Batal',
}

function avatarGradient(name: string) {
  const colors = [
    'from-cyan-400 to-blue-500','from-violet-400 to-purple-600',
    'from-emerald-400 to-teal-600','from-orange-400 to-red-500','from-pink-400 to-rose-600',
  ]
  const sum = (name ?? '').split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return colors[sum % colors.length]
}

function getInitials(name: string) {
  return (name ?? '').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?'
}

export default async function AdminDashboardPage() {
  const user = await getClinicUser()
  const db   = createAdminClient()
  const cid  = user.clinic_id

  const today      = new Date()
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString()
  const todayEnd   = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString()
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString()

  const [
    { count: totalPatients },
    { count: todayAppointments },
    { count: waitingCount },
    { data: todayApts },
    { data: monthBilling },
    { count: activeDoctors },
  ] = await Promise.all([
    db.from('patients').select('*', { count: 'exact', head: true }).eq('clinic_id', cid),
    db.from('appointments').select('*', { count: 'exact', head: true })
      .eq('clinic_id', cid).gte('scheduled_at', todayStart).lt('scheduled_at', todayEnd),
    db.from('appointments').select('*', { count: 'exact', head: true })
      .eq('clinic_id', cid).eq('status', 'menunggu')
      .gte('scheduled_at', todayStart).lt('scheduled_at', todayEnd),
    db.from('appointments')
      .select(`id, scheduled_at, status, complaint, queue_number,
        patients(no_rm, full_name),
        doctors(full_name)`)
      .eq('clinic_id', cid)
      .gte('scheduled_at', todayStart).lt('scheduled_at', todayEnd)
      .neq('status', 'batal')
      .order('queue_number', { ascending: true, nullsFirst: false })
      .order('scheduled_at', { ascending: true })
      .limit(8),
    db.from('billing').select('total').eq('clinic_id', cid).eq('status', 'paid').gte('created_at', monthStart),
    db.from('doctors').select('*', { count: 'exact', head: true }).eq('clinic_id', cid).eq('is_active', true),
  ])

  const pendapatan = (monthBilling ?? []).reduce((s, b) => s + (b.total ?? 0), 0)

  const stats = [
    { label: 'Total Pasien',         value: (totalPatients ?? 0).toLocaleString('id-ID'), Icon: Users,      color: 'from-blue-500 to-blue-600' },
    { label: 'Appointment Hari Ini', value: String(todayAppointments ?? 0),               Icon: Calendar,   color: 'from-violet-500 to-purple-600' },
    { label: 'Pendapatan Bulan Ini', value: fmtRupiah(pendapatan),                        Icon: DollarSign, color: 'from-emerald-500 to-teal-600' },
    { label: 'Antrian Sekarang',     value: String(waitingCount ?? 0),                    Icon: Clock,      color: 'from-amber-500 to-orange-500' },
  ]

  return (
    <div className="space-y-7">

      {/* Hero banner */}
      <div
        className="rounded-3xl p-8 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0A2342 0%, #0f2d5c 50%, #1B4F8A 100%)',
                 boxShadow: '0 20px 60px rgba(10,35,66,0.3)' }}
      >
        <div className="absolute inset-0 opacity-[0.05]"
          style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        <div className="relative z-10">
          <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-1">
            {today.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          <h1 className="text-2xl font-black text-white mb-6">Dashboard Admin</h1>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map(s => (
              <div key={s.label} className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-2xl p-5">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center mb-3 shadow-lg`}>
                  <s.Icon size={18} className="text-white" />
                </div>
                <p className="text-white/50 text-[11px] uppercase tracking-widest font-bold mb-1">{s.label}</p>
                <p className="text-white text-3xl font-black tabular-nums leading-none">{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Appointment list */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-black text-[#0C2340]">Appointment Hari Ini</h2>
            <Link href="/admin/appointments" className="text-[#0891B2] font-bold text-sm hover:underline">
              Lihat Semua →
            </Link>
          </div>

          {(!todayApts || todayApts.length === 0) ? (
            <div className="bg-white rounded-[20px] border border-gray-100 p-12 text-center"
              style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
              <Calendar size={40} className="text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm font-semibold">Belum ada appointment hari ini</p>
              <Link href="/admin/appointments/walkin"
                className="inline-flex mt-4 px-5 py-2.5 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary-hover transition-colors">
                + Daftarkan Walk-in
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {(todayApts as any[]).map((apt, i) => {
                const patientName = apt.patients?.full_name ?? 'Pasien'
                const doctorName  = apt.doctors?.full_name  ?? 'Dokter'
                const noRM        = apt.patients?.no_rm ?? '—'
                const time        = new Date(apt.scheduled_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                const styleCls    = STATUS_STYLE[apt.status] ?? 'bg-gray-50 text-gray-500 border-gray-200'
                return (
                  <div key={apt.id}
                    className="bg-white rounded-2xl p-5 border border-gray-100 hover:shadow-md transition-shadow flex items-center gap-4"
                    style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.04)', animationDelay: `${i * 40}ms` }}
                  >
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${avatarGradient(patientName)} flex items-center justify-center text-white font-black text-sm flex-shrink-0`}>
                      {apt.queue_number ?? '—'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-black text-[#0C2340] text-sm">{patientName}</p>
                        <span className="text-[11px] text-gray-400 font-mono">{noRM}</span>
                      </div>
                      <p className="text-xs text-gray-500">{doctorName} · {time}</p>
                      {apt.complaint && <p className="text-xs text-gray-400 truncate mt-0.5">{apt.complaint}</p>}
                    </div>
                    <span className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold ${styleCls}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      {STATUS_LABEL[apt.status]}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">
          <h2 className="text-base font-black text-[#0C2340]">Statistik Cepat</h2>

          <div className="bg-white rounded-[20px] border border-gray-100 p-6"
            style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
            <p className="text-[11px] uppercase tracking-widest font-bold text-gray-400 mb-2">Dokter Aktif</p>
            <p className="text-4xl font-black text-[#0C2340] tabular-nums">{activeDoctors ?? 0}</p>
            <div className="flex mt-3">
              {Array.from({ length: Math.min(activeDoctors ?? 0, 6) }).map((_, i) => (
                <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 border-2 border-white flex-shrink-0"
                  style={{ marginLeft: i > 0 ? '-8px' : '0' }} />
              ))}
            </div>
          </div>

          <div className="bg-white rounded-[20px] border border-gray-100 p-6"
            style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
            <p className="text-[11px] uppercase tracking-widest font-bold text-gray-400 mb-2">Total Pasien</p>
            <p className="text-4xl font-black text-[#0C2340] tabular-nums">{totalPatients ?? 0}</p>
            <div className="flex items-center gap-1.5 mt-2">
              <TrendingUp size={13} className="text-emerald-500" />
              <p className="text-xs text-emerald-600 font-bold">Terdaftar di klinik</p>
            </div>
          </div>

          <div className="bg-white rounded-[20px] border border-gray-100 p-6"
            style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
            <p className="text-[11px] uppercase tracking-widest font-bold text-gray-400 mb-2">Rating Klinik</p>
            <p className="text-4xl font-black text-[#0C2340]">4.8</p>
            <div className="flex gap-0.5 mt-2">
              {[1,2,3,4,5].map(i => (
                <Star key={i} size={16} className="text-amber-400 fill-amber-400" />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Link href="/admin/appointments/walkin"
              className="flex flex-col items-center gap-1 py-3 bg-[#0891B2] hover:bg-[#0e7490] text-white font-bold rounded-2xl transition-all text-xs shadow-sm text-center">
              <span className="text-lg">🚶</span>
              Walk-in
            </Link>
            <Link href="/admin/appointments"
              className="flex flex-col items-center gap-1 py-3 bg-white border border-gray-200 hover:bg-gray-50 text-secondary font-bold rounded-2xl transition-all text-xs text-center">
              <span className="text-lg">📋</span>
              Antrian
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
