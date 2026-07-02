import { getClinicUser } from '@/lib/clinic'
import { createAdminClient } from '@/lib/supabase/server'
import { OnboardingChecklist } from '@/components/onboarding/OnboardingChecklist'
import { getOnboardingState } from '@/lib/onboarding/state'
import { Users, Calendar, DollarSign, Clock, TrendingUp, Star, ArrowRight, GraduationCap } from 'lucide-react'
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
  // Shares one computation with the admin layout via React cache().
  const onboarding = await getOnboardingState()

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
    { label: 'Total Pasien',         value: (totalPatients ?? 0).toLocaleString('id-ID'), Icon: Users,      color: 'bg-blue-50 text-apple-blue' },
    { label: 'Appointments',         value: String(todayAppointments ?? 0),               Icon: Calendar,   color: 'bg-purple-50 text-purple-600' },
    { label: 'Revenue (Month)',      value: fmtRupiah(pendapatan),                        Icon: DollarSign, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Active Queue',         value: String(waitingCount ?? 0),                    Icon: Clock,      color: 'bg-orange-50 text-orange-600' },
  ]

  return (
    <div className="space-y-10 animate-fade-in">
      
      {/* ─── Header Section (Apple Style) ────────────────────────────────── */}
      <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 px-1">
        <div>
          <p className="text-[10px] md:text-[12px] text-gray-500 mb-1.5 font-bold uppercase tracking-widest flex items-center gap-2 sf-display">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            System Operational • {today.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' })}
          </p>
          <h2 className="text-[32px] md:text-[40px] sf-display-heavy tracking-tight text-[#1D1D1F] leading-tight text-mobile-balance">
            Dashboard Admin.
          </h2>
        </div>
        
        <div className="flex gap-3">
          {/* data-tour: mobile anchor for the "Antrian Live" tour step (sidebar
              drawer is off-screen on phones). */}
          <Link href="/admin/appointments/walkin"
            data-tour="nav-appointments"
            className="bg-[#1D1D1F] text-white px-6 py-4 md:py-3 rounded-2xl md:rounded-full text-sm sf-display-heavy shadow-lg hover:bg-black transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2 w-full md:w-auto">
            <Users size={16} /> Daftarkan Pasien
          </Link>
        </div>
      </header>

      {onboarding.checklistVisible && (
        <OnboardingChecklist
          items={onboarding.items}
          completed={onboarding.completed}
          total={onboarding.total}
          progress={onboarding.progress}
        />
      )}

      {/* ─── Stats Row (Rounded Apple) ──────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-[32px] p-6 apple-shadow border border-black/[0.03] group hover:scale-[1.02] transition-all">
            <div className={`w-12 h-12 rounded-2xl ${s.color} flex items-center justify-center mb-4 transition-transform group-hover:scale-110`}>
              <s.Icon size={20} />
            </div>
            <p className="text-gray-400 text-[11px] uppercase tracking-widest font-bold mb-1">{s.label}</p>
            <p className="text-[#1D1D1F] text-2xl md:text-3xl sf-display-heavy tabular-nums leading-none">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* ─── LEFT: Appointment List (Modern Table-less) ────────────────── */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-[22px] sf-display-heavy tracking-tight text-[#1D1D1F]">Antrian Hari Ini</h3>
            <Link href="/admin/appointments" className="text-sm sf-display text-apple-blue hover:text-blue-700 flex items-center gap-1">
              Lihat Detail <TrendingUp size={14}/>
            </Link>
          </div>

          {(!todayApts || todayApts.length === 0) ? (
            <div className="bg-white rounded-[32px] p-16 text-center apple-shadow border border-black/[0.03]">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar size={32} className="text-gray-300" />
              </div>
              <p className="text-gray-500 sf-display">Belum ada pasien yang terdaftar hari ini.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {(todayApts as any[]).map((apt, i) => {
                const patientName = apt.patients?.full_name ?? 'Pasien'
                const doctorName  = apt.doctors?.full_name  ?? 'Dokter'
                const noRM        = apt.patients?.no_rm ?? '—'
                const time        = new Date(apt.scheduled_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                const statusKey   = apt.status as keyof typeof STATUS_STYLE
                
                return (
                  <div key={apt.id}
                    className="bg-white rounded-[24px] p-5 apple-shadow apple-shadow-hover border border-black/[0.02] flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                  >
                    <div className="flex items-center gap-4 md:gap-5 min-w-0">
                      <div className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-br ${avatarGradient(patientName)} flex items-center justify-center text-white font-black text-base md:text-lg flex-shrink-0 group-hover:scale-105 transition-transform`}>
                        {apt.queue_number ?? '—'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <p className="sf-display text-[16px] md:text-[17px] text-[#1D1D1F] truncate font-bold">{patientName}</p>
                          <span className="text-[10px] md:text-[12px] text-gray-400 font-mono bg-gray-50 px-2 py-0.5 rounded border border-black/[0.03]">{noRM}</span>
                        </div>
                        <div className="flex items-center gap-2 md:gap-3 text-[12px] md:text-[13px] text-gray-500 font-medium">
                          <span className="truncate">{doctorName}</span>
                          <span className="opacity-40">•</span>
                          <span className="whitespace-nowrap font-bold text-gray-400">{time}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-3 sm:pt-0 border-t sm:border-0 border-black/[0.03]">
                        <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border-0 shadow-sm ${STATUS_STYLE[statusKey]}`}>
                            {STATUS_LABEL[statusKey]}
                        </span>
                        <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-apple-blue group-hover:text-white transition-all active:scale-90">
                            <ArrowRight size={18} />
                        </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ─── RIGHT: Secondary Stats & Tools ────────────────────────────── */}
        <div className="lg:col-span-4 space-y-6">
          <h3 className="text-[20px] sf-display-heavy tracking-tight text-[#1D1D1F] px-1">Statistik Cepat</h3>

          <div className="bg-[#1D1D1F] text-white rounded-[32px] p-6 md:p-8 apple-shadow relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-apple-blue opacity-20 rounded-full blur-2xl group-hover:opacity-30 transition-opacity"></div>
            <p className="text-[10px] md:text-[11px] uppercase tracking-widest font-bold text-gray-400 mb-2 relative z-10">Rating Klinik</p>
            <p className="text-4xl md:text-5xl sf-display-heavy text-white relative z-10">4.8</p>
            <div className="flex gap-1 mt-3 md:mt-4 relative z-10">
              {[1,2,3,4,5].map(i => (
                <Star key={i} size={18} className="text-amber-400 fill-amber-400" />
              ))}
            </div>
            <p className="text-[10px] md:text-xs text-gray-500 mt-5 md:mt-6 relative z-10 font-medium tracking-tight">Berdasarkan 1.2k+ ulasan pasien</p>
          </div>

          <div className="bg-white rounded-[32px] p-6 md:p-7 apple-shadow border border-black/[0.03]">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <p className="text-[10px] md:text-[11px] uppercase tracking-widest font-bold text-gray-400 mb-1">Dokter Aktif</p>
                    <p className="text-3xl md:text-4xl sf-display-heavy text-[#1D1D1F] tabular-nums">{activeDoctors ?? 0}</p>
                </div>
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-blue-50 text-apple-blue flex items-center justify-center">
                    <GraduationCap size={20} className="md:size-6" />
                </div>
            </div>
            <div className="flex -space-x-3 overflow-hidden">
              {Array.from({ length: Math.min(activeDoctors ?? 0, 6) }).map((_, i) => (
                <div key={i} className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 border-2 border-white flex-shrink-0 shadow-sm" />
              ))}
              {(activeDoctors ?? 0) > 6 && (
                <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-gray-50 border-2 border-white flex items-center justify-center text-[10px] font-bold text-gray-400 flex-shrink-0">
                    +{(activeDoctors ?? 0) - 6}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-[32px] p-7 apple-shadow border border-black/[0.03]">
            <p className="text-[11px] uppercase tracking-widest font-bold text-gray-400 mb-2">Pasien Terdaftar</p>
            <p className="text-4xl sf-display-heavy text-[#1D1D1F] tabular-nums">{totalPatients ?? 0}</p>
            <div className="flex items-center gap-1.5 mt-3">
              <div className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[10px] font-bold">TERVERIFIKASI</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
