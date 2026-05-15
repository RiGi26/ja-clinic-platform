import TopBar from '@/components/TopBar'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
const TIMES = ['08:00', '10:00', '13:00', '15:00', '17:00']

const DOCTORS = [
  { id: 1, name: 'Dr. Sarah Putri',  color: 'bg-cyan-500',    specialty: 'Dokter Umum' },
  { id: 2, name: 'Dr. Budi Santoso', color: 'bg-purple-500',  specialty: 'Spesialis Anak' },
  { id: 3, name: 'Dr. Ahmad Fauzi',  color: 'bg-emerald-500', specialty: 'Spesialis Penyakit Dalam' },
]

const SCHEDULES = [
  { doctor: 1, day: 'Senin',  time: '08:00', quota: 12, filled: 8  },
  { doctor: 1, day: 'Senin',  time: '13:00', quota: 10, filled: 10 },
  { doctor: 2, day: 'Senin',  time: '08:00', quota: 15, filled: 5  },
  { doctor: 1, day: 'Selasa', time: '08:00', quota: 12, filled: 3  },
  { doctor: 3, day: 'Rabu',   time: '13:00', quota: 8,  filled: 8  },
  { doctor: 2, day: 'Kamis',  time: '10:00', quota: 15, filled: 12 },
  { doctor: 1, day: 'Jumat',  time: '08:00', quota: 12, filled: 7  },
]

export const dynamic = 'force-dynamic'

export default function SchedulePage() {
  const getSlot = (day: string, time: string) =>
    SCHEDULES.filter(s => s.day === day && s.time === time)

  return (
    <div className="min-h-screen bg-background">
      <TopBar title="Jadwal Dokter" subtitle="Kelola jadwal praktik dokter" />

      <div className="p-8">
        {/* Week nav */}
        <div className="flex items-center justify-between mb-7">
          <div>
            <h2 className="text-xl font-black text-secondary">Minggu 12–18 Mei 2026</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Klik slot untuk melihat detail atau edit jadwal</p>
          </div>
          <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm">
            <button className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronLeft size={18} className="text-secondary" />
            </button>
            <span className="text-sm font-bold text-secondary px-2">Minggu Ini</span>
            <button className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronRight size={18} className="text-secondary" />
            </button>
          </div>
        </div>

        {/* Calendar grid */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-7">
          {/* Header */}
          <div className="grid grid-cols-7 border-b border-gray-100">
            <div className="p-4 bg-gray-50 border-r border-gray-100">
              <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Waktu</span>
            </div>
            {DAYS.map(day => (
              <div key={day} className="p-4 bg-gray-50 border-r border-gray-100 last:border-r-0 text-center">
                <span className="text-sm font-black text-secondary">{day}</span>
              </div>
            ))}
          </div>

          {/* Rows */}
          {TIMES.map(time => (
            <div key={time} className="grid grid-cols-7 border-b border-gray-50 last:border-b-0">
              <div className="p-4 border-r border-gray-100 bg-gray-50 flex items-start">
                <span className="text-sm font-bold text-secondary">{time}</span>
              </div>
              {DAYS.map(day => {
                const slots = getSlot(day, time)
                return (
                  <div key={`${day}-${time}`} className="p-2 border-r border-gray-50 last:border-r-0 min-h-[90px]">
                    {slots.map(s => {
                      const doc  = DOCTORS.find(d => d.id === s.doctor)
                      const pct  = Math.round((s.filled / s.quota) * 100)
                      const full = s.filled >= s.quota
                      return (
                        <div
                          key={`${s.doctor}-${day}-${time}`}
                          className={`${doc?.color} text-white rounded-xl p-2.5 mb-1.5 cursor-pointer hover:shadow-md transition-shadow`}
                        >
                          <p className="text-[11px] font-black mb-1.5 leading-tight">{doc?.name}</p>
                          <div className="w-full bg-white/30 rounded-full h-1.5 mb-1.5">
                            <div className="bg-white h-full rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <p className={`text-[10px] font-bold ${full ? 'text-red-200' : 'text-white/80'}`}>
                            {s.filled}/{s.quota} {full ? '(Penuh)' : ''}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        {/* Doctor cards */}
        <h3 className="text-base font-black text-secondary mb-4">Dokter Aktif</h3>
        <div className="grid grid-cols-3 gap-4">
          {DOCTORS.map(doc => (
            <div key={doc.id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl ${doc.color} flex items-center justify-center text-white font-black text-base flex-shrink-0`}>
                {doc.name.split(' ')[1][0]}
              </div>
              <div>
                <p className="font-black text-secondary text-sm">{doc.name}</p>
                <p className="text-xs text-muted-foreground font-semibold mt-0.5">{doc.specialty}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
