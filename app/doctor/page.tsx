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
    <div className="min-h-screen bg-background">
      <TopBar title="Dashboard Dokter"
        subtitle={`${doctorRec?.full_name ?? user.full_name} — ${doctorRec?.specialty ?? 'Dokter'}`}
        showSearch={false} />
      <div className="p-8">
        <div className="grid grid-cols-3 gap-5 mb-8">
          {[
            { label: 'Pasien Hari Ini', value: queue.length, Icon: Users,        color: 'text-blue-600',    bg: 'bg-blue-50'    },
            { label: 'Selesai',         value: selesai,       Icon: CheckCircle,  color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Menunggu',        value: menunggu,      Icon: Clock,        color: 'text-amber-600',   bg: 'bg-amber-50'   },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-xl ${s.bg} flex items-center justify-center flex-shrink-0`}>
                  <s.Icon size={24} className={s.color} />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-1">{s.label}</p>
                  <p className="text-4xl font-black text-secondary tabular-nums">{s.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <h2 className="text-xl font-black text-secondary mb-5">Antrian Pasien Hari Ini</h2>
        <DoctorQueueList initialQueue={queue} />
      </div>
    </div>
  )
}
