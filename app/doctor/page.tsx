import TopBar from '@/components/TopBar'
import { Users, CheckCircle, Clock } from 'lucide-react'

export const dynamic = 'force-dynamic'

const STATS = [
  { label: 'Pasien Hari Ini', value: '12', Icon: Users },
  { label: 'Selesai',         value: '7',  Icon: CheckCircle },
  { label: 'Menunggu',        value: '5',  Icon: Clock },
]

const QUEUE = [
  { id: 1, patient: 'Andi Wijaya',    noRM: 'RM-2024-001', time: '09:00', keluhan: 'Demam dan batuk sejak 3 hari',     status: 'Menunggu', avatar: 'AW' },
  { id: 2, patient: 'Siti Nurhaliza', noRM: 'RM-2024-002', time: '09:30', keluhan: 'Sakit kepala berkepanjangan',       status: 'Dipanggil', avatar: 'SN' },
  { id: 3, patient: 'Rudi Hartono',   noRM: 'RM-2024-003', time: '10:00', keluhan: 'Kontrol tekanan darah',            status: 'Diperiksa', avatar: 'RH' },
  { id: 4, patient: 'Maya Lestari',   noRM: 'RM-2024-004', time: '10:30', keluhan: 'Nyeri sendi lutut',                status: 'Selesai',  avatar: 'ML' },
]

const STATUS_STEPS = ['Menunggu', 'Dipanggil', 'Diperiksa', 'Selesai']

const AVATAR_COLORS = ['from-cyan-400 to-blue-500','from-violet-400 to-purple-600','from-emerald-400 to-teal-600','from-orange-400 to-red-500']

function avatarColor(name: string) {
  const sum = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return AVATAR_COLORS[sum % AVATAR_COLORS.length]
}

export default function DoctorDashboardPage() {
  return (
    <div className="min-h-screen bg-background">
      <TopBar title="Dashboard Dokter" subtitle="Dr. Sarah Putri — Dokter Umum" showSearch={false} />

      <div className="p-8">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-5 mb-8">
          {STATS.map(s => (
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

        <div className="space-y-4">
          {QUEUE.map((p, i) => {
            const step = STATUS_STEPS.indexOf(p.status)
            return (
              <div
                key={p.id}
                className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow animate-fade-in-up"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="flex items-start gap-5">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${avatarColor(p.patient)} flex items-center justify-center text-white font-black text-base flex-shrink-0`}>
                    {p.avatar}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-black text-secondary">{p.patient}</h3>
                        <p className="text-sm text-muted-foreground font-semibold">{p.noRM} · {p.time}</p>
                      </div>
                      {p.status !== 'Selesai' && (
                        <button className="px-5 py-2 bg-primary text-white rounded-xl hover:bg-primary-hover transition-colors font-bold text-sm">
                          Panggil Pasien
                        </button>
                      )}
                    </div>

                    <div className="mb-5">
                      <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-1">Keluhan</p>
                      <p className="text-sm text-secondary font-semibold">{p.keluhan}</p>
                    </div>

                    {/* Status stepper */}
                    <div className="flex items-center">
                      {STATUS_STEPS.map((s, idx) => (
                        <div key={s} className="flex-1 flex items-center">
                          <div className="flex flex-col items-center flex-1">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-sm transition-all ${
                              idx <= step ? 'bg-primary text-white' : 'bg-gray-100 text-gray-400'
                            }`}>
                              {idx + 1}
                            </div>
                            <span className={`text-[10px] font-bold mt-1.5 ${idx <= step ? 'text-primary' : 'text-gray-400'}`}>
                              {s}
                            </span>
                          </div>
                          {idx < STATUS_STEPS.length - 1 && (
                            <div className={`h-1 flex-1 mx-1 rounded-full ${idx < step ? 'bg-primary' : 'bg-gray-200'}`} />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
