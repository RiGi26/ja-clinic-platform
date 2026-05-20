'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { UserCheck, Stethoscope, FileText, XCircle, Check } from 'lucide-react'

const STATUS_STEPS = ['Menunggu', 'Dipanggil', 'Diperiksa', 'Selesai']
const STATUS_MAP: Record<string, string> = { menunggu:'Menunggu', dipanggil:'Dipanggil', diperiksa:'Diperiksa', selesai:'Selesai' }
const STATUS_FLOW: Record<string, string> = { menunggu:'dipanggil', dipanggil:'diperiksa' }
const NEXT_LABEL: Record<string, string>  = { menunggu:'Panggil', dipanggil:'Periksa' }
const NEXT_ICON: Record<string, React.ReactNode> = {
  menunggu:  <UserCheck size={14} />,
  dipanggil: <Stethoscope size={14} />,
}
const AVATAR_COLORS = ['from-cyan-400 to-blue-500','from-violet-400 to-purple-600','from-emerald-400 to-teal-600','from-orange-400 to-red-500']
function avatarColor(name: string) {
  return AVATAR_COLORS[(name ?? '').split('').reduce((a,c) => a+c.charCodeAt(0),0) % AVATAR_COLORS.length]
}

type Apt = {
  id: string; scheduled_at: string; status: string; complaint: string|null; queue_number: number|null
  patients: { id: string; no_rm: string; full_name: string; date_of_birth: string|null; gender: string|null } | null
}

export default function DoctorQueueList({ initialQueue }: { initialQueue: Apt[] }) {
  const [queue, setQueue]      = useState<Apt[]>(initialQueue)
  const [pending, startTrans]  = useTransition()

  async function updateStatus(id: string, newStatus: string) {
    startTrans(async () => {
      const res = await fetch('/api/doctor/queue', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      })
      if (res.ok) setQueue(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a))
    })
  }

  function calcAge(dob: string|null) {
    if (!dob) return '—'
    return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 86400000)) + ' th'
  }

  if (queue.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center shadow-sm">
        <p className="text-muted-foreground font-semibold text-sm">Belum ada pasien hari ini</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {queue.map((a, i) => {
        const patientName = a.patients?.full_name ?? 'Pasien'
        const noRM        = a.patients?.no_rm ?? '—'
        const time        = new Date(a.scheduled_at).toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' })
        const statusLabel = STATUS_MAP[a.status] ?? a.status
        const stepIdx     = STATUS_STEPS.indexOf(statusLabel)
        const nextSt      = STATUS_FLOW[a.status]
        const isDone      = a.status === 'selesai'
        const isActive    = ['menunggu','dipanggil','diperiksa'].includes(a.status)

        return (
          <div key={a.id} className={`bg-white rounded-[32px] p-6 md:p-8 apple-shadow border border-black/[0.02] transition-all duration-300 group ${isDone ? 'opacity-60' : 'hover:scale-[1.01]'}`}
            style={{ animationDelay:`${i*50}ms` }}>
            <div className="flex flex-col lg:flex-row gap-8">
              
              <div className="flex items-start gap-6 flex-1 min-w-0">
                {/* Queue number (Apple Style Badge) */}
                <div className={`w-16 h-16 rounded-[22px] bg-gradient-to-br ${avatarColor(patientName)} flex flex-col items-center justify-center text-white shrink-0 shadow-lg group-hover:scale-105 transition-transform`}>
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">Antrean</span>
                  <span className="text-2xl sf-display-heavy leading-none">{a.queue_number ?? i+1}</span>
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                        <div>
                            <h3 className="text-xl sf-display-heavy text-[#1D1D1F] mb-1">{patientName}</h3>
                            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 font-medium">
                                <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-xs">{noRM}</span>
                                <span>•</span>
                                <span>{calcAge(a.patients?.date_of_birth ?? null)}</span>
                                <span>•</span>
                                <span>{time}</span>
                            </div>
                        </div>

                        {/* Action buttons (Modern Pill) */}
                        {isActive && (
                            <div className="flex items-center gap-2">
                            {nextSt && (
                                <button onClick={() => updateStatus(a.id, nextSt)} disabled={pending}
                                className="flex items-center gap-2 px-5 py-2.5 bg-apple-blue text-white rounded-full hover:bg-[#005BB5] transition-all sf-display text-sm disabled:opacity-50 glow-button">
                                {NEXT_ICON[a.status]} {NEXT_LABEL[a.status]}
                                </button>
                            )}
                            {a.status === 'diperiksa' && (
                                <Link href={`/doctor/records?apt=${a.id}`}
                                className="flex items-center gap-2 px-5 py-2.5 bg-[#F5F5F7] text-[#1D1D1F] border border-black/5 rounded-full transition-all sf-display text-sm hover:bg-gray-200">
                                <FileText size={16} className="text-apple-blue" /> Rekam Medis
                                </Link>
                            )}
                            <button onClick={() => updateStatus(a.id, 'batal')} disabled={pending}
                                className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all" title="Batalkan">
                                <XCircle size={20} strokeWidth={2} />
                            </button>
                            </div>
                        )}
                    </div>

                    {a.complaint && (
                        <div className="bg-[#F8F9FA] rounded-2xl p-4 mb-6 border border-black/[0.02]">
                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">Keluhan Utama</p>
                            <p className="text-[15px] text-[#1D1D1F] font-medium leading-relaxed italic">"{a.complaint}"</p>
                        </div>
                    )}

                    {/* Progress steps (Clean Apple Style) */}
                    <div className="flex items-center gap-2">
                    {STATUS_STEPS.map((s, idx) => {
                        const isPast = idx < stepIdx;
                        const isCurrent = idx === stepIdx;
                        return (
                            <div key={s} className="flex-1">
                                <div className="flex flex-col gap-2">
                                    <div className={`h-1.5 rounded-full transition-all duration-500 ${isPast || isCurrent ? 'bg-apple-blue' : 'bg-gray-100'}`} />
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[10px] font-bold uppercase tracking-wider ${isCurrent ? 'text-apple-blue' : 'text-gray-400'}`}>{s}</span>
                                        {isPast && <div className="w-2 h-2 rounded-full bg-apple-blue/20 flex items-center justify-center"><Check size={8} className="text-apple-blue"/></div>}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                    </div>
                </div>
              </div>

            </div>
          </div>
        )
      })}
    </div>
  )
}
