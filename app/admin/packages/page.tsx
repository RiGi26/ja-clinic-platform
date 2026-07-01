'use client'

import { useState, useEffect, useCallback } from 'react'
import TopBar from '@/components/TopBar'
import { Plus, Save, Layers, Users, ToggleLeft, ToggleRight, ShoppingCart, XCircle } from 'lucide-react'

const INPUT_CLS = 'w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all'
const LABEL_CLS = 'block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5'

type Treatment = { id: string; name: string }
type Pkg = {
  id: string; name: string; treatment_id: string | null
  num_sessions: number; price: number; validity_days: number | null
  is_active: boolean; treatment_name: string | null; active_subscriptions: number
}
type PatientLite = { id: string; full_name: string; no_rm: string }
type Sub = {
  id: string; patient_name: string; patient_rm: string | null; package_name: string
  sessions_total: number; sessions_remaining: number; price_paid: number
  purchased_at: string; expires_at: string | null; status: string
}

const fmtRupiah = (n: number) => 'Rp ' + n.toLocaleString('id-ID')
const fmtDate = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso)) : '—'

// Effective status for display: an 'active' sub past its expiry reads as expired.
function effStatus(s: Sub): { label: string; cls: string } {
  const expired = s.status === 'active' && s.expires_at && new Date(s.expires_at).getTime() < Date.now()
  const key = expired ? 'expired' : s.status
  const map: Record<string, { label: string; cls: string }> = {
    active:    { label: 'Aktif',       cls: 'bg-green-100 text-green-700' },
    completed: { label: 'Selesai',     cls: 'bg-blue-100 text-blue-700' },
    expired:   { label: 'Kedaluwarsa', cls: 'bg-gray-200 text-gray-500' },
    cancelled: { label: 'Dibatalkan',  cls: 'bg-red-100 text-red-600' },
  }
  return map[key] ?? { label: key, cls: 'bg-gray-100 text-gray-500' }
}

export default function PackagesPage() {
  const [packages, setPackages]     = useState<Pkg[]>([])
  const [treatments, setTreatments] = useState<Treatment[]>([])
  const [patients, setPatients]     = useState<PatientLite[]>([])
  const [subs, setSubs]             = useState<Sub[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const [notice, setNotice]         = useState<string | null>(null)

  const [newPkg, setNewPkg] = useState({ name: '', treatment_id: '', num_sessions: '', price: '', validity_days: '' })
  const [adding, setAdding]     = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [sell, setSell]         = useState({ patient_id: '', package_id: '' })
  const [selling, setSelling]   = useState(false)

  // No synchronous setState here: `loading` starts true, and every setState below
  // runs after the await — keeps this safe to call from the mount effect.
  const loadAll = useCallback(async () => {
    try {
      const [p, t, pa, s] = await Promise.all([
        fetch('/api/admin/packages').then(r => r.json()),
        fetch('/api/admin/treatments?active=true').then(r => r.json()),
        fetch('/api/admin/patients').then(r => r.json()),
        fetch('/api/admin/subscriptions').then(r => r.json()),
      ])
      setPackages(p.packages ?? [])
      setTreatments(t.treatments ?? [])
      setPatients(pa.patients ?? [])
      setSubs(s.subscriptions ?? [])
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => { loadAll() }, [loadAll])

  const flash = (m: string) => { setNotice(m); setTimeout(() => setNotice(null), 3000) }
  const activePackages = packages.filter(p => p.is_active)

  async function addPackage(e: React.FormEvent) {
    e.preventDefault()
    setAdding(true); setError(null)
    try {
      const res = await fetch('/api/admin/packages', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newPkg.name,
          treatment_id: newPkg.treatment_id || null,
          num_sessions: Number(newPkg.num_sessions),
          price: Number(newPkg.price),
          validity_days: newPkg.validity_days ? Number(newPkg.validity_days) : null,
        }),
      })
      const data = await res.json() as { error?: string }
      if (!res.ok) { setError(data.error ?? 'Gagal menambah paket'); return }
      setNewPkg({ name: '', treatment_id: '', num_sessions: '', price: '', validity_days: '' })
      flash('Paket ditambahkan')
      await loadAll()
    } finally {
      setAdding(false)
    }
  }

  function setPkgField(id: string, k: keyof Pkg, v: string | number | boolean | null) {
    setPackages(ps => ps.map(p => p.id === id ? { ...p, [k]: v } : p))
  }

  async function savePackage(p: Pkg) {
    setSavingId(p.id); setError(null)
    try {
      const res = await fetch(`/api/admin/packages/${p.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: p.name, treatment_id: p.treatment_id || null,
          num_sessions: p.num_sessions, price: p.price, validity_days: p.validity_days,
        }),
      })
      const data = await res.json() as { error?: string }
      if (!res.ok) { setError(data.error ?? 'Gagal menyimpan'); return }
      flash('Perubahan disimpan')
      await loadAll()
    } finally {
      setSavingId(null)
    }
  }

  async function toggleActive(p: Pkg) {
    setSavingId(p.id); setError(null)
    try {
      const res = await fetch(`/api/admin/packages/${p.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !p.is_active }),
      })
      const data = await res.json() as { error?: string }
      if (!res.ok) { setError(data.error ?? 'Gagal mengubah status'); return }
      setPkgField(p.id, 'is_active', !p.is_active)
      flash(p.is_active ? 'Paket dinonaktifkan' : 'Paket diaktifkan')
    } finally {
      setSavingId(null)
    }
  }

  async function sellPackage(e: React.FormEvent) {
    e.preventDefault()
    if (!sell.patient_id || !sell.package_id) return
    setSelling(true); setError(null)
    try {
      const res = await fetch('/api/admin/subscriptions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sell),
      })
      const data = await res.json() as { error?: string }
      if (!res.ok) { setError(data.error ?? 'Gagal menjual paket'); return }
      setSell({ patient_id: '', package_id: '' })
      flash('Paket terjual — langganan pasien dibuat')
      await loadAll()
    } finally {
      setSelling(false)
    }
  }

  async function cancelSub(sub: Sub) {
    if (!confirm(`Batalkan langganan paket "${sub.package_name}" milik ${sub.patient_name}? Sisa sesi tidak bisa dipakai lagi.`)) return
    setSavingId(sub.id); setError(null)
    try {
      const res = await fetch(`/api/admin/subscriptions/${sub.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      })
      const data = await res.json() as { error?: string }
      if (!res.ok) { setError(data.error ?? 'Gagal membatalkan'); return }
      flash('Langganan dibatalkan')
      await loadAll()
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <TopBar title="Paket Sesi" subtitle="Kelola paket multi-sesi & langganan pasien" showSearch={false} />
      <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
        {notice && <div className="bg-success/10 border border-success/20 rounded-2xl p-4 text-success font-bold text-sm">✅ {notice}</div>}
        {error &&  <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-4 text-destructive font-bold text-sm">{error}</div>}

        {/* ── Add package ─────────────────────────────────────────────── */}
        <form onSubmit={addPackage} className="bg-white rounded-2xl border border-gray-100 p-7 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <Layers size={18} className="text-primary" />
            <h2 className="font-black text-secondary text-base">Tambah Paket</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className={LABEL_CLS}>Nama Paket *</label>
              <input value={newPkg.name} onChange={e => setNewPkg(b => ({ ...b, name: e.target.value }))}
                placeholder="mis. Paket Rehab 10 Sesi" className={INPUT_CLS} />
            </div>
            <div className="md:col-span-2">
              <label className={LABEL_CLS}>Tindakan Terkait (opsional)</label>
              <select value={newPkg.treatment_id} onChange={e => setNewPkg(b => ({ ...b, treatment_id: e.target.value }))} className={INPUT_CLS}>
                <option value="">— Umum (tanpa tindakan spesifik) —</option>
                {treatments.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL_CLS}>Jumlah Sesi *</label>
              <input type="number" min={1} value={newPkg.num_sessions} onChange={e => setNewPkg(b => ({ ...b, num_sessions: e.target.value }))}
                placeholder="10" className={INPUT_CLS} />
            </div>
            <div>
              <label className={LABEL_CLS}>Harga (Rp) *</label>
              <input type="number" min={0} value={newPkg.price} onChange={e => setNewPkg(b => ({ ...b, price: e.target.value }))}
                placeholder="2500000" className={INPUT_CLS} />
            </div>
            <div>
              <label className={LABEL_CLS}>Masa Berlaku (hari)</label>
              <input type="number" min={1} value={newPkg.validity_days} onChange={e => setNewPkg(b => ({ ...b, validity_days: e.target.value }))}
                placeholder="Kosong = tanpa batas" className={INPUT_CLS} />
            </div>
          </div>
          <button type="submit" disabled={adding || !newPkg.name.trim() || !newPkg.num_sessions || !newPkg.price}
            className="mt-5 flex items-center gap-1.5 px-4 py-2.5 bg-primary text-white rounded-xl hover:bg-primary-hover transition-colors font-bold text-sm disabled:opacity-50">
            <Plus size={14} /> {adding ? 'Menambah…' : 'Tambah Paket'}
          </button>
        </form>

        {/* ── Package catalog ─────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 p-7 shadow-sm">
          <h2 className="font-black text-secondary text-base mb-5">Daftar Paket</h2>
          {loading ? <p className="text-sm text-muted-foreground text-center py-8">Memuat…</p>
            : packages.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">Belum ada paket.</p>
            : (
            <div className="space-y-4">
              {packages.map(p => (
                <div key={p.id} className={`rounded-xl p-4 border ${p.is_active ? 'bg-gray-50 border-gray-100' : 'bg-gray-100/60 border-gray-200 opacity-75'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500">
                      <Users size={13} /> {p.active_subscriptions} langganan aktif
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>
                        {p.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                      <button type="button" onClick={() => toggleActive(p)} disabled={savingId === p.id}
                        className="text-gray-500 hover:text-primary transition-colors disabled:opacity-50"
                        aria-label={p.is_active ? 'Nonaktifkan paket' : 'Aktifkan paket'}>
                        {p.is_active ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                      </button>
                    </div>
                  </div>
                  <div className="grid md:grid-cols-6 gap-3">
                    <div className="md:col-span-3">
                      <label className={LABEL_CLS}>Nama Paket</label>
                      <input value={p.name} onChange={e => setPkgField(p.id, 'name', e.target.value)} className={INPUT_CLS} />
                    </div>
                    <div className="md:col-span-3">
                      <label className={LABEL_CLS}>Tindakan</label>
                      <select value={p.treatment_id ?? ''} onChange={e => setPkgField(p.id, 'treatment_id', e.target.value || null)} className={INPUT_CLS}>
                        <option value="">— Umum —</option>
                        {treatments.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className={LABEL_CLS}>Jumlah Sesi</label>
                      <input type="number" min={1} value={p.num_sessions} onChange={e => setPkgField(p.id, 'num_sessions', Number(e.target.value))} className={INPUT_CLS} />
                    </div>
                    <div className="md:col-span-2">
                      <label className={LABEL_CLS}>Harga (Rp)</label>
                      <input type="number" min={0} value={p.price} onChange={e => setPkgField(p.id, 'price', Number(e.target.value))} className={INPUT_CLS} />
                    </div>
                    <div className="md:col-span-2">
                      <label className={LABEL_CLS}>Berlaku (hari)</label>
                      <input type="number" min={1} value={p.validity_days ?? ''} placeholder="∞"
                        onChange={e => setPkgField(p.id, 'validity_days', e.target.value ? Number(e.target.value) : null)} className={INPUT_CLS} />
                    </div>
                  </div>
                  <div className="mt-3 flex justify-end">
                    <button type="button" onClick={() => savePackage(p)} disabled={savingId === p.id || !p.name.trim()}
                      className="flex items-center gap-1.5 px-4 py-2 bg-primary/10 text-primary rounded-xl hover:bg-primary/20 transition-colors font-bold text-sm disabled:opacity-50">
                      <Save size={14} /> {savingId === p.id ? 'Menyimpan…' : 'Simpan'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Sell package to a patient ───────────────────────────────── */}
        <form onSubmit={sellPackage} className="bg-white rounded-2xl border border-gray-100 p-7 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <ShoppingCart size={18} className="text-primary" />
            <h2 className="font-black text-secondary text-base">Jual Paket ke Pasien</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className={LABEL_CLS}>Pasien *</label>
              <select value={sell.patient_id} onChange={e => setSell(s => ({ ...s, patient_id: e.target.value }))} className={INPUT_CLS}>
                <option value="">— Pilih pasien —</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.full_name} ({p.no_rm})</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL_CLS}>Paket *</label>
              <select value={sell.package_id} onChange={e => setSell(s => ({ ...s, package_id: e.target.value }))} className={INPUT_CLS}>
                <option value="">— Pilih paket aktif —</option>
                {activePackages.map(p => <option key={p.id} value={p.id}>{p.name} · {p.num_sessions} sesi · {fmtRupiah(p.price)}</option>)}
              </select>
            </div>
          </div>
          <button type="submit" disabled={selling || !sell.patient_id || !sell.package_id}
            className="mt-5 flex items-center gap-1.5 px-4 py-2.5 bg-primary text-white rounded-xl hover:bg-primary-hover transition-colors font-bold text-sm disabled:opacity-50">
            <ShoppingCart size={14} /> {selling ? 'Memproses…' : 'Jual Paket'}
          </button>
          {activePackages.length === 0 && <p className="mt-3 text-xs text-muted-foreground">Belum ada paket aktif untuk dijual. Tambah paket dulu di atas.</p>}
        </form>

        {/* ── Subscriptions ───────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 p-7 shadow-sm">
          <h2 className="font-black text-secondary text-base mb-5">Langganan Pasien</h2>
          {loading ? <p className="text-sm text-muted-foreground text-center py-8">Memuat…</p>
            : subs.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">Belum ada langganan paket.</p>
            : (
            <div className="space-y-3">
              {subs.map(s => {
                const st = effStatus(s)
                const used = s.sessions_total - s.sessions_remaining
                const pct = s.sessions_total > 0 ? Math.round((used / s.sessions_total) * 100) : 0
                return (
                  <div key={s.id} className="flex items-center gap-4 p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-secondary text-sm">{s.patient_name}</span>
                        {s.patient_rm && <span className="text-[11px] text-gray-400 font-mono">{s.patient_rm}</span>}
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${st.cls}`}>{st.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{s.package_name} · {fmtRupiah(s.price_paid)}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="h-1.5 w-28 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[11px] font-bold text-gray-500">{s.sessions_remaining}/{s.sessions_total} sesi tersisa</span>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Beli {fmtDate(s.purchased_at)}{s.expires_at ? ` · Berlaku s/d ${fmtDate(s.expires_at)}` : ' · Tanpa kedaluwarsa'}
                      </p>
                    </div>
                    {(s.status === 'active' || s.status === 'completed') && (
                      <button type="button" onClick={() => cancelSub(s)} disabled={savingId === s.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-destructive text-xs font-bold rounded-lg hover:bg-destructive/10 transition-colors disabled:opacity-50"
                        aria-label="Batalkan langganan">
                        <XCircle size={14} /> Batalkan
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
