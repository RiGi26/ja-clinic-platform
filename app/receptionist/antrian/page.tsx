'use client'

import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Phone } from 'lucide-react'

type QueueItem = {
  id: string; scheduled_at: string; status: string; complaint: string | null; queue_number: number | null
  patients: { full_name: string; no_rm: string; phone: string | null } | null
  doctors:  { id: string; full_name: string; specialty: string } | null
}
type Doctor = { id: string; full_name: string; specialty: string }

const STATUS_CONFIG: Record<string, { label: string; badge: string }> = {
  menunggu:  { label: 'Menunggu',    badge: 'bg-amber-100 text-amber-700' },
  dipanggil: { label: 'Dipanggil',   badge: 'bg-blue-100 text-blue-700' },
  diperiksa: { label: 'Diperiksa',   badge: 'bg-purple-100 text-purple-700' },
  selesai:   { label: 'Selesai',     badge: 'bg-emerald-100 text-emerald-700' },
}

function fmtTime(iso: string) {
  return new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
}

export default function AntrianPage() {
  const [queue,     setQueue]     = useState<QueueItem[]>([])
  const [doctors,   setDoctors]   = useState<Doctor[]>([])
  const [doctorF,   setDoctorF]   = useState('')
  const [loading,   setLoading]   = useState(true)
  const [updating,  setUpdating]  = useState<string | null>(null)
  const [toast,     setToast]     = useState<string | null>(null)

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 3000) }

  const load = useCallback(async () => {
    const params = new URLSearchParams()
    if (doctorF) params.set('doctor_id', doctorF)
    const res = await fetch(`/api/receptionist/queue?${params}`)
    const d   = await res.json() as { queue?: QueueItem[] }
    setQueue(d.queue ?? [])
    setLoading(false)
  }, [doctorF])

  useEffect(() => {
    fetch('/api/admin/clinic-doctors').then(r => r.json()).then(d => setDoctors(d.doctors ?? []))
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(load, 15_000)
    return () => clearInterval(id)
  }, [load])

  async function updateStatus(apt: QueueItem, status: string) {
    setUpdating(apt.id)
    const res = await fetch('/api/receptionist/queue', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appointment_id: apt.id, status }),
    })
    if (res.ok) { showToast('Status berhasil diupdate'); load() }
    else showToast('Gagal update status')
    setUpdating(null)
  }

  const active   = queue.filter(q => q.status !== 'selesai')
  const done     = queue.filter(q => q.status === 'selesai')
  const current  = queue.find(q => q.status === 'dipanggil' || q.status === 'diperiksa')

  return (
    <div>
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-gray-900 text-white px-5 py-3 rounded-2xl shadow-xl font-bold text-sm">{toast}</div>
      )}

      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-secondary">Kelola Antrian</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Panggil dan kelola antrian pasien hari ini</p>
        </div>
        <div className="flex gap-2">
          <select value={doctorF} onChange={e => setDoctorF(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none">
            <option value="">Semua Dokter</option>
            {doctors.map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}
          </select>
          <button onClick={load} className="p-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
            <RefreshCw size={14} className={loading ? 'animate-spin text-primary' : 'text-gray-400'} />
          </button>
        </div>
      </div>

      {/* Current patient highlight */}
      {current && (
        <div className="bg-gradient-to-r from-primary to-primary-hover text-white rounded-2xl p-6 mb-6 shadow-lg">
          <p className="text-white/70 text-xs font-bold uppercase tracking-widest mb-2">Sedang Diperiksa</p>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3">
                <span className="text-4xl font-black">{String(current.queue_number ?? 0).padStart(3, '0')}</span>
                <div>
                  <p className="font-black text-lg">{(current.patients as any)?.full_name}</p>
                  <p className="text-white/70 text-sm">{(current.doctors as any)?.full_name}</p>
                </div>
              </div>
            </div>
            {(current.patients as any)?.phone && (
              <a href={`tel:${(current.patients as any).phone}`}
                className="flex items-center gap-2 px-4 py-2 bg-white/20 rounded-xl text-sm font-bold hover:bg-white/30 transition-colors">
                <Phone size={14} /> {(current.patients as any).phone}
              </a>
            )}
          </div>
        </div>
      )}

      {/* Active queue */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-5">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-black text-secondary text-sm">Antrian Menunggu ({active.length})</h2>
        </div>
        {loading ? (
          <div className="py-10 text-center text-sm text-muted-foreground">Memuat...</div>
        ) : active.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">Tidak ada antrian menunggu</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {active.map(a => (
              <div key={a.id} className={`p-5 flex items-center gap-4 flex-wrap ${a.status === 'dipanggil' || a.status === 'diperiksa' ? 'bg-blue-50/50' : ''}`}>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-base font-black flex-shrink-0 ${
                  a.status === 'dipanggil' || a.status === 'diperiksa'
                    ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {a.queue_number ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-secondary">{(a.patients as any)?.full_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(a.patients as any)?.no_rm} · {fmtTime(a.scheduled_at)} · {(a.doctors as any)?.full_name}
                  </p>
                  {a.complaint && <p className="text-xs text-gray-400 truncate">{a.complaint}</p>}
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_CONFIG[a.status]?.badge ?? 'bg-gray-100 text-gray-500'}`}>
                  {STATUS_CONFIG[a.status]?.label ?? a.status}
                </span>
                <div className="flex gap-2 flex-wrap">
                  {a.status === 'menunggu' && (
                    <button onClick={() => updateStatus(a, 'dipanggil')} disabled={updating === a.id}
                      className="px-3 py-1.5 text-xs font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 whitespace-nowrap">
                      📢 Panggil
                    </button>
                  )}
                  {(a.status === 'dipanggil' || a.status === 'diperiksa') && (
                    <button onClick={() => updateStatus(a, 'selesai')} disabled={updating === a.id}
                      className="px-3 py-1.5 text-xs font-bold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 whitespace-nowrap">
                      ✓ Selesai
                    </button>
                  )}
                  {a.status === 'menunggu' && (
                    <button onClick={() => updateStatus(a, 'batal')} disabled={updating === a.id}
                      className="px-3 py-1.5 text-xs font-bold bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50 whitespace-nowrap">
                      Skip
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Done */}
      {done.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden opacity-60">
          <div className="px-6 py-3 border-b border-gray-100">
            <h2 className="font-black text-secondary text-xs uppercase tracking-widest">Selesai Hari Ini ({done.length})</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {done.map(a => (
              <div key={a.id} className="px-5 py-3 flex items-center gap-4">
                <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 text-xs font-black flex items-center justify-center flex-shrink-0">
                  {a.queue_number ?? '—'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-600 text-sm">{(a.patients as any)?.full_name}</p>
                  <p className="text-xs text-gray-400">{fmtTime(a.scheduled_at)} · {(a.doctors as any)?.full_name}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
