'use client'

import { useState, useEffect, useCallback } from 'react'
import { Users, Clock, CheckCircle, Activity, RefreshCw } from 'lucide-react'

type Appointment = {
  id: string; scheduled_at: string; status: string; complaint: string | null
  queue_number: number | null; type: string
  patients: { full_name: string; no_rm: string; phone: string | null } | null
  doctors:  { full_name: string; specialty: string } | null
}

const STATUS_BADGE: Record<string, string> = {
  menunggu:  'bg-amber-100 text-amber-700',
  dipanggil: 'bg-blue-100 text-blue-700',
  diperiksa: 'bg-purple-100 text-purple-700',
  selesai:   'bg-emerald-100 text-emerald-700',
  batal:     'bg-gray-100 text-gray-500',
}
const STATUS_LABEL: Record<string, string> = {
  menunggu: 'Menunggu', dipanggil: 'Dipanggil', diperiksa: 'Diperiksa',
  selesai: 'Selesai', batal: 'Batal',
}

function fmtTime(iso: string) {
  return new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
}

export default function ReceptionistDashboard() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading,      setLoading]      = useState(true)
  const [lastRefresh,  setLastRefresh]  = useState(new Date())

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/receptionist/checkin')
      const d   = await res.json() as { appointments?: Appointment[] }
      setAppointments(d.appointments ?? [])
      setLastRefresh(new Date())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(load, 30_000)
    return () => clearInterval(id)
  }, [load])

  const total    = appointments.length
  const menunggu = appointments.filter(a => a.status === 'menunggu').length
  const dipanggil = appointments.filter(a => ['dipanggil', 'diperiksa'].includes(a.status)).length
  const selesai  = appointments.filter(a => a.status === 'selesai').length

  const antrian = appointments
    .filter(a => ['menunggu', 'dipanggil', 'diperiksa'].includes(a.status))
    .sort((a, b) => (a.queue_number ?? 999) - (b.queue_number ?? 999))

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-secondary">Dashboard Receptionist</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Update: {lastRefresh.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Hari Ini', value: total,     Icon: Users,         color: 'text-blue-600',   bg: 'bg-blue-50' },
          { label: 'Menunggu',       value: menunggu,  Icon: Clock,         color: 'text-amber-600',  bg: 'bg-amber-50' },
          { label: 'Sedang Diperiksa', value: dipanggil, Icon: Activity,    color: 'text-violet-600', bg: 'bg-violet-50' },
          { label: 'Selesai',        value: selesai,   Icon: CheckCircle,   color: 'text-emerald-600', bg: 'bg-emerald-50' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center mb-3`}>
              <s.Icon size={18} className={s.color} />
            </div>
            <p className="text-3xl font-black text-secondary">{s.value}</p>
            <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Appointment Table */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-black text-secondary text-sm">Appointment Hari Ini</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Antrian', 'Pasien', 'Dokter', 'Jam', 'Status'].map(h => (
                    <th key={h} className="text-left text-[10px] uppercase tracking-widest font-bold text-gray-400 px-4 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td colSpan={5} className="py-10 text-center text-sm text-gray-400">Memuat...</td></tr>
                ) : appointments.length === 0 ? (
                  <tr><td colSpan={5} className="py-10 text-center text-sm text-gray-400">Belum ada appointment hari ini</td></tr>
                ) : appointments.map(a => (
                  <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="w-8 h-8 rounded-full bg-primary/10 text-primary font-black text-sm flex items-center justify-center">
                        {a.queue_number ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-gray-800 text-sm">{(a.patients as any)?.full_name}</p>
                      <p className="text-xs text-gray-400">{(a.patients as any)?.no_rm}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">{(a.doctors as any)?.full_name}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{fmtTime(a.scheduled_at)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_BADGE[a.status] ?? 'bg-gray-100 text-gray-500'}`}>
                        {STATUS_LABEL[a.status] ?? a.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live Queue */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-black text-secondary text-sm">Antrian Aktif</h2>
            <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full">{antrian.length} orang</span>
          </div>
          <div className="divide-y divide-gray-50">
            {antrian.length === 0 ? (
              <p className="px-6 py-10 text-center text-sm text-gray-400">Tidak ada antrian aktif</p>
            ) : antrian.map(a => (
              <div key={a.id} className="px-6 py-4 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0 ${
                  a.status === 'dipanggil' || a.status === 'diperiksa'
                    ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {a.queue_number ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-800 text-sm truncate">{(a.patients as any)?.full_name}</p>
                  <p className="text-xs text-gray-400 truncate">{(a.doctors as any)?.full_name}</p>
                </div>
                <span className={`text-[10px] px-2 py-1 rounded-full font-bold whitespace-nowrap ${STATUS_BADGE[a.status]}`}>
                  {STATUS_LABEL[a.status]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
