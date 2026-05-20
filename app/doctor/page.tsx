import { redirect } from 'next/navigation'
import { getClinicUser } from '@/lib/clinic'
import { createAdminClient } from '@/lib/supabase/server'
import TopBar from '@/components/TopBar'
import { Users, CheckCircle, Clock } from 'lucide-react'
import DoctorQueueList from './DoctorQueueList'

export const dynamic = 'force-dynamic'

export default async function DoctorDashboardPage() {
  const user = await getClinicUser()
  if (user.role !== 'doctor') redirect('/auth/login')

  const db = createAdminClient()
  const todayStart = new Date(); todayStart.setHours(0,0,0,0)
  const todayEnd   = new Date(); todayEnd.setHours(23,59,59,999)

  const { data: doctorRec } = await db
    .from('doctors')
    .select('id, full_name, specialty')
    .eq('user_id', user.id)
    .eq('clinic_id', user.clinic_id)
    .single()

  const doctorId = doctorRec?.id

  const { data: apts } = doctorId ? await db
    .from('appointments')
    .select(`
      id, scheduled_at, status, complaint, type, queue_number,
      patients(id, no_rm, full_name, phone, date_of_birth, gender, blood_type, allergies, weight, height)
    `)
    .eq('clinic_id', user.clinic_id)
    .eq('doctor_id', doctorId)
    .gte('scheduled_at', todayStart.toISOString())
    .lte('scheduled_at', todayEnd.toISOString())
    .neq('status', 'batal')
    .order('queue_number', { ascending: true, nullsFirst: false })
    : { data: [] }

  const queue    = (apts ?? []) as any[]
  const selesai  = queue.filter(a => a.status === 'selesai').length
  const menunggu = queue.filter(a => a.status === 'menunggu').length

  return (
    <div className="space-y-10 animate-fade-in">
      {/* ─── Header Section ────────────────────────────────── */}
      <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-6">
        <div>
          <p className="text-[12px] text-gray-500 mb-1.5 font-bold uppercase tracking-widest flex items-center gap-2 sf-display">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            Doctor Active Session • {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' })}
          </p>
          <h2 className="text-[32px] md:text-[40px] sf-display-heavy tracking-tight text-[#1D1D1F] leading-tight">
            Okaeri, Dr. {(doctorRec?.full_name ?? user.full_name).split(' ')[0]}.
          </h2>
          <p className="text-gray-500 text-sm mt-1 sf-display">{doctorRec?.specialty ?? 'General Practitioner'}</p>
        </div>
        
        <div className="flex gap-3">
          <div className="bg-white/80 backdrop-blur-md border border-black/5 px-4 py-2 rounded-full flex items-center gap-2 shadow-sm">
            <Clock size={16} className="text-apple-blue" />
            <span className="text-xs font-bold text-gray-900 tabular-nums">Shift: 08:00 - 16:00</span>
          </div>
        </div>
      </header>

      {/* ─── Stats Row ──────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Total Pasien', value: queue.length, Icon: Users,        color: 'bg-blue-50 text-apple-blue'    },
          { label: 'Telah Selesai', value: selesai,       Icon: CheckCircle,  color: 'bg-[#F3FBF5] text-green-600' },
          { label: 'Menunggu',        value: menunggu,      Icon: Clock,        color: 'bg-orange-50 text-orange-600'   },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-[32px] p-6 apple-shadow border border-black/[0.03] flex items-center gap-5 group hover:scale-[1.02] transition-all">
            <div className={`w-14 h-14 rounded-2xl ${s.color} flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110`}>
              <s.Icon size={24} />
            </div>
            <div>
              <p className="text-gray-400 text-[11px] uppercase tracking-widest font-bold mb-0.5">{s.label}</p>
              <p className="text-3xl sf-display-heavy text-[#1D1D1F] tabular-nums leading-none">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between px-2">
            <h3 className="text-[22px] sf-display-heavy tracking-tight text-[#1D1D1F]">Antrian Pasien Hari Ini</h3>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest bg-gray-100 px-2 py-1 rounded-lg">Real-time Sync</span>
        </div>
        <DoctorQueueList initialQueue={queue} />
      </div>
    </div>
  )
}
