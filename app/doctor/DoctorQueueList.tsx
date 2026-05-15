'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { UserCheck, Stethoscope, FileText, XCircle } from 'lucide-react'

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
    <div className="space-y-4">
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
          <div key={a.id} className={`bg-white rounded-2xl p-6 border shadow-sm transition-shadow hover:shadow-md ${isDone ? 'opacity-60 border-gray-100' : 'border-gray-100'}`}
            style={{ animationDelay:`${i*50}ms` }}>
            <div className="flex items-start gap-5">
              {/* Queue number */}
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${avatarColor(patientName)} flex items-center justify-center text-white font-black text-xl flex-shrink-0`}>
                {a.queue_number ?? i+1}
              </div>

              <div className="flex-1">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-black text-secondary">{patientName}</h3>
                    <p className="text-sm text-muted-foreground font-semibold">
                      {noRM} · {calcAge(a.patients?.date_of_birth ?? null)} · {time}
                    </p>
                    {a.complaint && (
                      <p className="text-sm text-secondary/70 mt-1 font-semibold">{a.complaint}</p>
                    )}
                  </div>

                  {/* Action buttons */}
                  {isActive && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {nextSt && (
                        <button onClick={() => updateStatus(a.id, nextSt)} disabled={pending}
                          className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary-hover transition-colors font-bold text-sm disabled:opacity-50">
                          {NEXT_ICON[a.status]} {NEXT_LABEL[a.status]}
                        </button>
                      )}
                      {a.status === 'diperiksa' && (
                        <Link href={`/doctor/records?apt=${a.id}`}
                          className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl transition-colors font-bold text-sm">
                          <FileText size={14} /> Rekam Medis
                        </Link>
                      )}
                      <button onClick={() => updateStatus(a.id, 'batal')} disabled={pending}
                        className="p-2 hover:bg-red-50 rounded-xl transition-colors" title="Batalkan">
                        <XCircle size={16} className="text-red-400" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Progress steps */}
                <div className="flex items-center">
                  {STATUS_STEPS.map((s, idx) => (
                    <div key={s} className="flex-1 flex items-center">
                      <div className="flex flex-col items-center flex-1">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-sm transition-all ${idx <= stepIdx ? 'bg-primary text-white' : 'bg-gray-100 text-gray-400'}`}>
                          {idx+1}
                        </div>
                        <span className={`text-[10px] font-bold mt-1.5 ${idx <= stepIdx ? 'text-primary' : 'text-gray-400'}`}>{s}</span>
                      </div>
                      {idx < STATUS_STEPS.length-1 && (
                        <div className={`h-1 flex-1 mx-1 rounded-full ${idx < stepIdx ? 'bg-primary' : 'bg-gray-200'}`} />
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
  )
}
