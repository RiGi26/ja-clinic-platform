'use client'

import { useState, useTransition } from 'react'
import TopBar from '@/components/TopBar'
import { Search, RefreshCw, UserCheck, Stethoscope, CheckCircle, XCircle } from 'lucide-react'
import Link from 'next/link'

const STATUS_FLOW: Record<string, string> = {
  menunggu:  'dipanggil',
  dipanggil: 'diperiksa',
  diperiksa: 'selesai',
}
const STATUS_STYLE: Record<string, string> = {
  menunggu:  'bg-amber-50   text-amber-600   border-amber-200',
  dipanggil: 'bg-cyan-50    text-cyan-600    border-cyan-200',
  diperiksa: 'bg-blue-50    text-blue-600    border-blue-200',
  selesai:   'bg-emerald-50 text-emerald-600 border-emerald-200',
  batal:     'bg-red-50     text-red-500     border-red-200',
}
const STATUS_LABEL: Record<string, string> = {
  menunggu: 'Menunggu', dipanggil: 'Dipanggil', diperiksa: 'Diperiksa', selesai: 'Selesai', batal: 'Batal',
}
const NEXT_LABEL: Record<string, string> = {
  menunggu: 'Panggil', dipanggil: 'Periksa', diperiksa: 'Selesai',
}
const NEXT_ICON: Record<string, React.ReactNode> = {
  menunggu:  <UserCheck size={14} />,
  dipanggil: <Stethoscope size={14} />,
  diperiksa: <CheckCircle size={14} />,
}

function avatarGradient(name: string) {
  const colors = ['from-cyan-400 to-blue-500','from-violet-400 to-purple-600','from-emerald-400 to-teal-600','from-orange-400 to-red-500','from-pink-400 to-rose-600']
  return colors[(name ?? '').split('').reduce((a,c) => a+c.charCodeAt(0),0) % colors.length]
}

type Apt = {
  id: string; scheduled_at: string; status: string; complaint: string|null
  type: string; queue_number: number|null
  patients: { id: string; no_rm: string; full_name: string; phone: string|null; gender: string|null } | null
  doctors: { id: string; full_name: string; specialty: string } | null
}

const FILTERS = ['Semua','Menunggu','Dipanggil','Diperiksa','Selesai','Batal']

export default function AppointmentsClient({ initial }: { initial: Apt[] }) {
  const [apts, setApts]         = useState<Apt[]>(initial)
  const [filter, setFilter]     = useState('Semua')
  const [search, setSearch]     = useState('')
  const [pending, startTransition] = useTransition()

  const filtered = apts.filter(a => {
    const matchFilter = filter === 'Semua' || STATUS_LABEL[a.status] === filter
    const q = search.toLowerCase()
    const matchSearch = !q ||
      (a.patients?.full_name.toLowerCase().includes(q)) ||
      (a.patients?.no_rm.toLowerCase().includes(q)) ||
      (a.doctors?.full_name.toLowerCase().includes(q))
    return matchFilter && matchSearch
  })

  async function updateStatus(id: string, newStatus: string) {
    startTransition(async () => {
      const res = await fetch('/api/admin/appointments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      })
      if (res.ok) {
        setApts(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a))
      }
    })
  }

  function fmtTime(iso: string) {
    return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="min-h-screen bg-background">
      <TopBar title="Manajemen Antrian" subtitle={`${apts.length} appointment hari ini`} showSearch={false} />
      <div className="p-8">

        {/* Filters + Search */}
        <div className="flex items-center justify-between mb-5 gap-4 flex-wrap">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Cari nama, No.RM, dokter..."
              className="pl-11 pr-5 py-3 bg-white border border-gray-200 rounded-xl w-full sm:w-72 text-sm focus:outline-none focus:ring-2 focus:ring-primary shadow-sm" />
          </div>
          <Link href="/admin/appointments/walkin"
            className="flex items-center gap-2 px-5 py-3 bg-primary text-white rounded-xl font-bold text-sm shadow-sm hover:bg-primary-hover transition-colors">
            + Walk-in
          </Link>
        </div>

        {/* Status filters */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full font-bold text-sm transition-all ${filter === f ? 'bg-primary text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
              {f}
              {f === 'Semua' ? ` (${apts.length})` : ` (${apts.filter(a => STATUS_LABEL[a.status] === f).length})`}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center shadow-sm">
            <p className="text-muted-foreground font-semibold text-sm">Tidak ada appointment</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(apt => {
              const name    = apt.patients?.full_name ?? 'Pasien'
              const noRM    = apt.patients?.no_rm ?? '—'
              const doctor  = apt.doctors?.full_name ?? '—'
              const time    = fmtTime(apt.scheduled_at)
              const nextSt  = STATUS_FLOW[apt.status]
              const isActive = ['menunggu','dipanggil','diperiksa'].includes(apt.status)

              return (
                <div key={apt.id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-4">
                    {/* Queue number */}
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${avatarGradient(name)} flex items-center justify-center text-white font-black text-lg flex-shrink-0`}>
                      {apt.queue_number ?? '—'}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-black text-secondary text-sm">{name}</p>
                        <span className="text-[11px] text-gray-400 font-mono">{noRM}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${apt.type === 'walkin' ? 'bg-orange-100 text-orange-600' : 'bg-blue-50 text-blue-600'}`}>
                          {apt.type === 'walkin' ? 'Walk-in' : 'Booking'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{doctor} · {time}</p>
                      {apt.complaint && <p className="text-xs text-gray-400 truncate mt-0.5">{apt.complaint}</p>}
                    </div>

                    {/* Status */}
                    <span className={`flex-shrink-0 px-3 py-1.5 rounded-full border text-xs font-bold ${STATUS_STYLE[apt.status]}`}>
                      {STATUS_LABEL[apt.status]}
                    </span>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isActive && nextSt && (
                        <button
                          onClick={() => updateStatus(apt.id, nextSt)}
                          disabled={pending}
                          className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-xl font-bold text-xs hover:bg-primary-hover transition-colors disabled:opacity-50"
                        >
                          {NEXT_ICON[apt.status]}
                          {NEXT_LABEL[apt.status]}
                        </button>
                      )}
                      {isActive && (
                        <button
                          onClick={() => updateStatus(apt.id, 'batal')}
                          disabled={pending}
                          className="p-2 hover:bg-red-50 rounded-xl transition-colors"
                          title="Batalkan"
                        >
                          <XCircle size={16} className="text-red-400" />
                        </button>
                      )}
                      {!isActive && apt.status === 'selesai' && (
                        <RefreshCw size={14} className="text-gray-300" />
                      )}
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
