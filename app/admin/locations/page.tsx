'use client'

import { useState, useEffect, useCallback } from 'react'
import TopBar from '@/components/TopBar'
import { Plus, Save, Building2, Users, ToggleLeft, ToggleRight, MapPin, Phone } from 'lucide-react'

const INPUT_CLS = 'w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all'
const LABEL_CLS = 'block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5'

type Location = {
  id: string
  name: string
  address: string | null
  phone: string | null
  working_hours: unknown
  is_active: boolean
  created_at: string
  doctor_count: number
}

export default function LocationsPage() {
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading]     = useState(true)
  const [newBranch, setNewBranch] = useState({ name: '', address: '', phone: '' })
  const [adding, setAdding]       = useState(false)
  const [savingId, setSavingId]   = useState<string | null>(null)
  const [error, setError]         = useState<string | null>(null)
  const [notice, setNotice]       = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/locations')
      const data = await res.json() as { locations?: Location[] }
      setLocations(data.locations ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function flash(msg: string) { setNotice(msg); setTimeout(() => setNotice(null), 3000) }

  async function addBranch(e: React.FormEvent) {
    e.preventDefault()
    if (!newBranch.name.trim()) return
    setAdding(true); setError(null)
    try {
      const res = await fetch('/api/admin/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBranch),
      })
      const data = await res.json() as { location?: Location; error?: string }
      if (!res.ok || !data.location) { setError(data.error ?? 'Gagal menambah cabang'); return }
      setLocations(ls => [...ls, data.location!])
      setNewBranch({ name: '', address: '', phone: '' })
      flash('Cabang ditambahkan')
    } finally {
      setAdding(false)
    }
  }

  function setField(id: string, k: keyof Location, v: string | boolean) {
    setLocations(ls => ls.map(l => l.id === id ? { ...l, [k]: v } : l))
  }

  async function saveBranch(loc: Location) {
    setSavingId(loc.id); setError(null)
    try {
      const res = await fetch(`/api/admin/locations/${loc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: loc.name, address: loc.address, phone: loc.phone }),
      })
      const data = await res.json() as { error?: string }
      if (!res.ok) { setError(data.error ?? 'Gagal menyimpan'); return }
      flash('Perubahan disimpan')
    } finally {
      setSavingId(null)
    }
  }

  async function toggleActive(loc: Location) {
    setSavingId(loc.id); setError(null)
    try {
      const res = await fetch(`/api/admin/locations/${loc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !loc.is_active }),
      })
      const data = await res.json() as { error?: string }
      if (!res.ok) { setError(data.error ?? 'Gagal mengubah status'); return }
      setField(loc.id, 'is_active', !loc.is_active)
      flash(loc.is_active ? 'Cabang dinonaktifkan' : 'Cabang diaktifkan')
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <TopBar title="Cabang Klinik" subtitle="Kelola lokasi/cabang praktik" showSearch={false} />
      <div className="p-8 max-w-3xl mx-auto space-y-6">
        {notice && (
          <div className="bg-success/10 border border-success/20 rounded-2xl p-4 text-success font-bold text-sm">
            ✅ {notice}
          </div>
        )}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-4 text-destructive font-bold text-sm">
            {error}
          </div>
        )}

        {/* Add branch */}
        <form onSubmit={addBranch} className="bg-white rounded-2xl border border-gray-100 p-7 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <Building2 size={18} className="text-primary" />
            <h2 className="font-black text-secondary text-base">Tambah Cabang</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className={LABEL_CLS}>Nama Cabang *</label>
              <input value={newBranch.name} onChange={e => setNewBranch(b => ({ ...b, name: e.target.value }))}
                placeholder="mis. Cabang Depok" className={INPUT_CLS} />
            </div>
            <div>
              <label className={LABEL_CLS}>No. Telepon</label>
              <input value={newBranch.phone} onChange={e => setNewBranch(b => ({ ...b, phone: e.target.value }))}
                placeholder="021-xxxxxxxx" className={INPUT_CLS} />
            </div>
            <div>
              <label className={LABEL_CLS}>Alamat</label>
              <input value={newBranch.address} onChange={e => setNewBranch(b => ({ ...b, address: e.target.value }))}
                placeholder="Alamat cabang" className={INPUT_CLS} />
            </div>
          </div>
          <button type="submit" disabled={adding || !newBranch.name.trim()}
            className="mt-5 flex items-center gap-1.5 px-4 py-2.5 bg-primary text-white rounded-xl hover:bg-primary-hover transition-colors font-bold text-sm disabled:opacity-50">
            <Plus size={14} /> {adding ? 'Menambah...' : 'Tambah Cabang'}
          </button>
        </form>

        {/* List */}
        <div className="bg-white rounded-2xl border border-gray-100 p-7 shadow-sm">
          <h2 className="font-black text-secondary text-base mb-5">Daftar Cabang</h2>
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Memuat…</p>
          ) : locations.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Belum ada cabang.</p>
          ) : (
            <div className="space-y-4">
              {locations.map(loc => (
                <div key={loc.id} className={`rounded-xl p-4 border ${loc.is_active ? 'bg-gray-50 border-gray-100' : 'bg-gray-100/60 border-gray-200 opacity-75'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500">
                      <Users size={13} /> {loc.doctor_count} terapis aktif
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${loc.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>
                        {loc.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                      <button type="button" onClick={() => toggleActive(loc)} disabled={savingId === loc.id}
                        className="text-gray-500 hover:text-primary transition-colors disabled:opacity-50"
                        aria-label={loc.is_active ? 'Nonaktifkan cabang' : 'Aktifkan cabang'}>
                        {loc.is_active ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-3">
                      <label className={LABEL_CLS}><Building2 size={11} className="inline mr-1" />Nama Cabang</label>
                      <input value={loc.name} onChange={e => setField(loc.id, 'name', e.target.value)} className={INPUT_CLS} />
                    </div>
                    <div className="col-span-2">
                      <label className={LABEL_CLS}><MapPin size={11} className="inline mr-1" />Alamat</label>
                      <input value={loc.address ?? ''} onChange={e => setField(loc.id, 'address', e.target.value)} className={INPUT_CLS} />
                    </div>
                    <div>
                      <label className={LABEL_CLS}><Phone size={11} className="inline mr-1" />Telepon</label>
                      <input value={loc.phone ?? ''} onChange={e => setField(loc.id, 'phone', e.target.value)} className={INPUT_CLS} />
                    </div>
                  </div>
                  <div className="mt-3 flex justify-end">
                    <button type="button" onClick={() => saveBranch(loc)} disabled={savingId === loc.id || !loc.name.trim()}
                      className="flex items-center gap-1.5 px-4 py-2 bg-primary/10 text-primary rounded-xl hover:bg-primary/20 transition-colors font-bold text-sm disabled:opacity-50">
                      <Save size={14} /> {savingId === loc.id ? 'Menyimpan…' : 'Simpan'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
