'use client'

import { useState, useEffect, useCallback } from 'react'
import { Building2, Clock, CreditCard, AlertTriangle, TrendingUp, X, Users } from 'lucide-react'

type ClinicStats = {
  total: number; trial: number; paid: number; suspended: number; new_this_month: number
}
type ClinicEntry = {
  id: string; name: string; email: string | null; phone: string | null
  plan_expires_at: string | null; slug: string
}
type UserStats = { admin: number; doctor: number; receptionist: number; patient: number }
type GrowthEntry = { month: string; count: number }
type OverviewData = {
  clinic_stats: ClinicStats
  trial_expiring: ClinicEntry[]
  recently_expired: ClinicEntry[]
  user_stats: UserStats
  growth: GrowthEntry[]
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso))
}
function daysFromNow(iso: string | null) {
  if (!iso) return 0
  return Math.round((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}
function daysAgo(iso: string | null) {
  if (!iso) return 0
  return Math.round((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24))
}

function ExtendTrialModal({ clinic, onClose, onSuccess }: { clinic: ClinicEntry; onClose: () => void; onSuccess: () => void }) {
  const [days, setDays] = useState(14)
  const [loading, setLoading] = useState(false)

  const base = clinic.plan_expires_at && new Date(clinic.plan_expires_at) > new Date()
    ? new Date(clinic.plan_expires_at) : new Date()
  const previewDate = new Date(base.getTime() + days * 24 * 60 * 60 * 1000)

  async function handleExtend() {
    setLoading(true)
    const expiresAt = previewDate.toISOString().split('T')[0]
    await fetch(`/api/superadmin/clinics/${clinic.id}/activate`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: 'trial', expires_at: expiresAt }),
    })
    onSuccess(); onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-7 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-black text-gray-900 text-lg">Extend Trial</h3>
          <button onClick={onClose}><X size={16} className="text-gray-500" /></button>
        </div>
        <p className="text-sm text-gray-500 mb-4">Klinik: <strong>{clinic.name}</strong></p>
        <div className="flex gap-2 mb-4">
          {[7, 14, 30].map(d => (
            <button key={d} onClick={() => setDays(d)}
              className={`flex-1 py-2 rounded-xl text-sm font-bold border-2 transition-colors ${days === d ? 'border-cyan-500 bg-cyan-50 text-cyan-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
              {d} Hari
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500 mb-5">
          Akan berakhir: <strong>{fmtDate(previewDate.toISOString())}</strong>
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-200 transition-colors">Batal</button>
          <button onClick={handleExtend} disabled={loading}
            className="flex-1 py-3 bg-cyan-600 text-white rounded-xl font-bold text-sm hover:bg-cyan-700 transition-colors disabled:opacity-50">
            {loading ? 'Memproses...' : `Extend ${days} Hari`}
          </button>
        </div>
      </div>
    </div>
  )
}

function ActivateModal({ clinic, onClose, onSuccess }: { clinic: ClinicEntry; onClose: () => void; onSuccess: () => void }) {
  const [plan, setPlan] = useState('trial')
  const [expiresAt, setExpiresAt] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  async function handleActivate() {
    if (plan === 'trial' && !expiresAt) { setErr('Tanggal berakhir wajib diisi untuk plan trial'); return }
    setLoading(true); setErr('')
    const res = await fetch(`/api/superadmin/clinics/${clinic.id}/activate`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan, expires_at: expiresAt || undefined }),
    })
    const data = await res.json() as { error?: string }
    if (res.ok) { onSuccess(); onClose() } else { setErr(data.error ?? 'Gagal'); setLoading(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-7 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-black text-gray-900 text-lg">Aktifkan Klinik</h3>
          <button onClick={onClose}><X size={16} className="text-gray-500" /></button>
        </div>
        <p className="text-sm text-gray-500 mb-4">Klinik: <strong>{clinic.name}</strong></p>
        <div className="mb-4">
          <label className="text-[10px] uppercase tracking-widest font-bold text-gray-500 block mb-2">Pilih Plan</label>
          <div className="grid grid-cols-2 gap-2">
            {['trial', 'basic', 'pro', 'custom'].map(p => (
              <button key={p} onClick={() => setPlan(p)}
                className={`py-2 rounded-xl text-sm font-bold border-2 transition-colors capitalize ${plan === p ? 'border-cyan-500 bg-cyan-50 text-cyan-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                {p}
              </button>
            ))}
          </div>
        </div>
        {plan === 'trial' && (
          <div className="mb-4">
            <label className="text-[10px] uppercase tracking-widest font-bold text-gray-500 block mb-2">Berakhir Pada</label>
            <input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500" />
          </div>
        )}
        {err && <p className="text-sm text-red-600 mb-3 font-medium">{err}</p>}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-200 transition-colors">Batal</button>
          <button onClick={handleActivate} disabled={loading}
            className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-colors disabled:opacity-50">
            {loading ? 'Memproses...' : 'Aktifkan'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function SuperAdminDashboard() {
  const [data, setData]               = useState<OverviewData | null>(null)
  const [loading, setLoading]         = useState(true)
  const [toast, setToast]             = useState<string | null>(null)
  const [extendModal, setExtendModal] = useState<ClinicEntry | null>(null)
  const [activateModal, setActivateModal] = useState<ClinicEntry | null>(null)

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 3000) }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/superadmin/overview')
      const d   = await res.json() as OverviewData
      setData(d)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-96">
        <p className="text-gray-400 text-sm">Memuat data...</p>
      </div>
    )
  }
  if (!data) return null

  const { clinic_stats: cs, trial_expiring, recently_expired, user_stats, growth } = data
  const totalUsers  = Object.values(user_stats).reduce((a, b) => a + b, 0)
  const maxGrowth   = Math.max(...growth.map(g => g.count), 1)
  const hasWarnings = trial_expiring.length > 0 || recently_expired.length > 0

  const statCards = [
    { label: 'Total Klinik',       value: cs.total,          Icon: Building2,     color: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-gray-100' },
    { label: 'Trial Aktif',        value: cs.trial,          Icon: Clock,         color: 'text-amber-600',  bg: 'bg-amber-50',  border: cs.trial > 0 ? 'border-amber-200' : 'border-gray-100' },
    { label: 'Berbayar',           value: cs.paid,           Icon: CreditCard,    color: 'text-green-600',  bg: 'bg-green-50',  border: 'border-gray-100' },
    { label: 'Suspended/Nonaktif', value: cs.suspended,      Icon: AlertTriangle, color: cs.suspended > 0 ? 'text-red-600' : 'text-gray-500', bg: cs.suspended > 0 ? 'bg-red-50' : 'bg-gray-50', border: cs.suspended > 0 ? 'border-red-200' : 'border-gray-100' },
    { label: 'Baru Bulan Ini',     value: cs.new_this_month, Icon: TrendingUp,    color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-gray-100' },
  ]

  const userRows: { label: string; key: keyof UserStats; color: string }[] = [
    { label: 'Admin',       key: 'admin',        color: 'bg-blue-500' },
    { label: 'Dokter',      key: 'doctor',       color: 'bg-green-500' },
    { label: 'Resepsionis', key: 'receptionist', color: 'bg-amber-500' },
    { label: 'Pasien',      key: 'patient',      color: 'bg-violet-500' },
  ]

  return (
    <div className="p-8 space-y-8">
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-gray-900 text-white px-5 py-3 rounded-2xl shadow-xl font-bold text-sm">
          {toast}
        </div>
      )}

      <div>
        <h1 className="text-2xl font-black text-gray-900">Platform Overview — Clinic Platform</h1>
        <p className="text-gray-500 text-sm mt-1">Data realtime seluruh klinik terdaftar</p>
      </div>

      {/* Stats Row */}
      <div className="flex gap-4 overflow-x-auto pb-1">
        {statCards.map(s => (
          <div key={s.label} className={`bg-white rounded-2xl p-5 border ${s.border} shadow-sm flex-shrink-0 min-w-[158px]`}>
            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
              <s.Icon size={18} className={s.color} />
            </div>
            <p className="text-3xl font-black text-gray-900 mb-1">{s.value}</p>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider leading-tight">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Warning Section */}
      {hasWarnings && (
        <div className="bg-white rounded-2xl border border-amber-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-amber-50 border-b border-amber-100">
            <h2 className="font-black text-amber-800 text-sm">⚠️ Perlu Perhatian</h2>
          </div>
          <div className="p-6 space-y-6">
            {trial_expiring.length > 0 && (
              <div>
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Trial Hampir Habis</h3>
                <div className="space-y-2">
                  {trial_expiring.map(c => (
                    <div key={c.id} className="flex items-center justify-between gap-3 py-2 border-b border-gray-50 last:border-0">
                      <div className="min-w-0">
                        <p className="font-bold text-gray-800 text-sm truncate">{c.name}</p>
                        <p className="text-xs text-gray-400">{c.phone ?? '—'}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg whitespace-nowrap">
                          {daysFromNow(c.plan_expires_at)} hari lagi
                        </span>
                        <button onClick={() => setExtendModal(c)}
                          className="text-[10px] font-bold bg-cyan-100 text-cyan-700 px-3 py-1.5 rounded-lg hover:bg-cyan-200 transition-colors whitespace-nowrap">
                          Extend +14 Hari
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {recently_expired.length > 0 && (
              <div>
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Baru Expired</h3>
                <div className="space-y-2">
                  {recently_expired.map(c => (
                    <div key={c.id} className="flex items-center justify-between gap-3 py-2 border-b border-gray-50 last:border-0">
                      <div className="min-w-0">
                        <p className="font-bold text-gray-800 text-sm truncate">{c.name}</p>
                        <p className="text-xs text-gray-400">{c.phone ?? '—'}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-lg whitespace-nowrap">
                          {daysAgo(c.plan_expires_at)} hari lalu
                        </span>
                        <button onClick={() => setActivateModal(c)}
                          className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg hover:bg-emerald-200 transition-colors whitespace-nowrap">
                          Aktifkan
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Growth Chart + User Stats */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-black text-gray-900 text-sm mb-6">Klinik Baru (6 Bulan Terakhir)</h2>
          {growth.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Belum ada data</p>
          ) : (
            <div className="flex items-end justify-around gap-2 h-40">
              {growth.map(g => (
                <div key={g.month} className="flex flex-col items-center gap-1 flex-1 group relative">
                  <span className="text-xs font-bold text-gray-700">{g.count}</span>
                  <div
                    className="w-full bg-cyan-500 rounded-t-md relative"
                    style={{ height: `${Math.max((g.count / maxGrowth) * 96, 4)}px` }}
                  >
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                      {g.month}: {g.count}
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-400 whitespace-nowrap">{g.month}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-black text-gray-900 text-sm">Pengguna Platform</h2>
            <span className="flex items-center gap-1.5 text-xs font-bold text-gray-500">
              <Users size={14} /> {totalUsers} total
            </span>
          </div>
          <div className="space-y-4">
            {userRows.map(row => {
              const count = user_stats[row.key]
              const pct   = totalUsers > 0 ? (count / totalUsers) * 100 : 0
              return (
                <div key={row.key}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{row.label}</span>
                    <span className="text-sm font-bold text-gray-900">{count}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full ${row.color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {extendModal && (
        <ExtendTrialModal
          clinic={extendModal}
          onClose={() => setExtendModal(null)}
          onSuccess={() => { showToast('Trial berhasil diperpanjang'); load() }}
        />
      )}
      {activateModal && (
        <ActivateModal
          clinic={activateModal}
          onClose={() => setActivateModal(null)}
          onSuccess={() => { showToast('Klinik berhasil diaktifkan'); load() }}
        />
      )}
    </div>
  )
}
