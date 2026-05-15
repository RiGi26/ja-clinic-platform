import { redirect } from 'next/navigation'
import { getClinicUser } from '@/lib/clinic'
import { createAdminClient } from '@/lib/supabase/server'
import TopBar from '@/components/TopBar'
import { Users, CheckCircle, Clock } from 'lucide-react'

export const dynamic = 'force-dynamic'

const STATUS_STEPS = ['Menunggu', 'Dipanggil', 'Diperiksa', 'Selesai']
const STATUS_MAP: Record<string, string> = { menunggu:'Menunggu', dipanggil:'Dipanggil', diperiksa:'Diperiksa', selesai:'Selesai' }
const AVATAR_COLORS = ['from-cyan-400 to-blue-500','from-violet-400 to-purple-600','from-emerald-400 to-teal-600','from-orange-400 to-red-500']
function avatarColor(name: string) {
  const sum = name.split('').reduce((a,c) => a+c.charCodeAt(0),0)
  return AVATAR_COLORS[sum % AVATAR_COLORS.length]
}

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
    .select('id, scheduled_at, status, complaint, patients(full_name, no_rm)')
    .eq('clinic_id', user.clinic_id)
    .eq('doctor_id', doctorId)
    .gte('scheduled_at', todayStart.toISOString())
    .lte('scheduled_at', todayEnd.toISOString())
    .neq('status', 'batal')
    .order('scheduled_at', { ascending: true }) : { data: [] }

  const queue = (apts ?? []) as any[]
  const selesai  = queue.filter(a => a.status === 'selesai').length
  const menunggu = queue.filter(a => a.status === 'menunggu').length

  return (
    <div className="min-h-screen bg-background">
      <TopBar title="Dashboard Dokter" subtitle={`${doctorRec?.full_name ?? user.full_name} — ${doctorRec?.specialty ?? 'Dokter'}`} showSearch={false} />
      <div className="p-8">
        <div className="grid grid-cols-3 gap-5 mb-8">
          {[
            { label:'Pasien Hari Ini', value: queue.length, Icon: Users },
            { label:'Selesai',         value: selesai,       Icon: CheckCircle },
            { label:'Menunggu',        value: menunggu,      Icon: Clock },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <s.Icon size={24} className="text-primary" />
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

        {queue.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center shadow-sm">
            <p className="text-muted-foreground font-semibold text-sm">Belum ada pasien hari ini</p>
          </div>
        ) : (
          <div className="space-y-4">
            {queue.map((a: any, i: number) => {
              const patientName = a.patients?.full_name ?? 'Pasien'
              const noRM        = a.patients?.no_rm ?? '—'
              const time        = new Date(a.scheduled_at).toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' })
              const statusLabel = STATUS_MAP[a.status] ?? a.status
              const stepIdx     = STATUS_STEPS.indexOf(statusLabel)
              return (
                <div key={a.id} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow animate-fade-in-up" style={{ animationDelay:`${i*50}ms` }}>
                  <div className="flex items-start gap-5">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${avatarColor(patientName)} flex items-center justify-center text-white font-black text-base flex-shrink-0`}>
                      {patientName.split(' ').map((w:string)=>w[0]).slice(0,2).join('').toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-lg font-black text-secondary">{patientName}</h3>
                          <p className="text-sm text-muted-foreground font-semibold">{noRM} · {time}</p>
                        </div>
                        {a.status !== 'selesai' && (
                          <button className="px-5 py-2 bg-primary text-white rounded-xl hover:bg-primary-hover transition-colors font-bold text-sm">
                            Panggil Pasien
                          </button>
                        )}
                      </div>
                      {a.complaint && (
                        <div className="mb-4">
                          <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-1">Keluhan</p>
                          <p className="text-sm text-secondary font-semibold">{a.complaint}</p>
                        </div>
                      )}
                      <div className="flex items-center">
                        {STATUS_STEPS.map((s, idx) => (
                          <div key={s} className="flex-1 flex items-center">
                            <div className="flex flex-col items-center flex-1">
                              <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-sm transition-all ${idx <= stepIdx ? 'bg-primary text-white' : 'bg-gray-100 text-gray-400'}`}>{idx+1}</div>
                              <span className={`text-[10px] font-bold mt-1.5 ${idx <= stepIdx ? 'text-primary' : 'text-gray-400'}`}>{s}</span>
                            </div>
                            {idx < STATUS_STEPS.length-1 && <div className={`h-1 flex-1 mx-1 rounded-full ${idx < stepIdx ? 'bg-primary' : 'bg-gray-200'}`} />}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
