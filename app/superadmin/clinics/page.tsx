'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, Plus, ExternalLink, RefreshCw, X } from 'lucide-react'

const INPUT = 'w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all'
const LABEL = 'text-[10px] uppercase tracking-widest font-bold text-gray-500 block mb-2'

type Clinic = {
  id: string; name: string; slug: string; phone: string | null
  plan: string; plan_expires_at: string | null; is_active: boolean
  created_at: string; patient_count: number
}

const PLAN_BADGE: Record<string, string> = {
  trial:  'bg-amber-100 text-amber-700',
  basic:  'bg-blue-100 text-blue-700',
  pro:    'bg-green-100 text-green-700',
  custom: 'bg-violet-100 text-violet-700',
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso))
}

function isExpired(iso: string | null) {
  return iso ? new Date(iso) < new Date() : false
}

type CreateForm = { name: string; slug: string; admin_email: string; admin_password: string; admin_name: string; plan: string }

export default function ClinicsPage() {
  const [clinics,  setClinics]  = useState<Clinic[]>([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [planF,    setPlanF]    = useState('')
  const [statusF,  setStatusF]  = useState('')
  const [toast,    setToast]    = useState<string | null>(null)

  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm]             = useState<CreateForm>({ name: '', slug: '', admin_email: '', admin_password: '', admin_name: '', plan: 'trial' })
  const [creating,   setCreating]   = useState(false)
  const [createErr,  setCreateErr]  = useState('')

  const [impersonating, setImpersonating] = useState<string | null>(null)
  const [confirmDeactivate, setConfirmDeactivate] = useState<Clinic | null>(null)

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 3000) }

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (planF)  params.set('plan', planF)
    if (statusF) params.set('status', statusF)
    const res = await fetch(`/api/superadmin/clinics?${params}`)
    const d   = await res.json() as { clinics?: Clinic[] }
    setClinics(d.clinics ?? [])
    setLoading(false)
  }, [search, planF, statusF])

  useEffect(() => { load() }, [load])

  async function extendTrial(id: string) {
    const res = await fetch(`/api/superadmin/clinics/${id}/extend-trial`, { method: 'POST' })
    if (res.ok) { showToast('Trial diperpanjang 14 hari'); load() }
  }

  async function changePlan(id: string, plan: string) {
    await fetch(`/api/superadmin/clinics/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan }),
    })
    showToast('Plan berhasil diubah'); load()
  }

  async function toggleActive(clinic: Clinic) {
    await fetch(`/api/superadmin/clinics/${clinic.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !clinic.is_active }),
    })
    showToast(clinic.is_active ? 'Klinik dinonaktifkan' : 'Klinik diaktifkan')
    setConfirmDeactivate(null); load()
  }

  async function impersonate(clinicId: string) {
    setImpersonating(clinicId)
    try {
      const res  = await fetch('/api/superadmin/impersonate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clinic_id: clinicId }),
      })
      const data = await res.json() as { magic_link?: string; admin_name?: string; error?: string }
      if (data.magic_link) {
        window.open(data.magic_link, '_blank')
        showToast(`Membuka sesi admin: ${data.admin_name}`)
      } else {
        showToast('❌ ' + (data.error ?? 'Gagal impersonasi'))
      }
    } finally { setImpersonating(null) }
  }

  async function handleCreate() {
    if (!form.name || !form.slug || !form.admin_email || !form.admin_password || !form.admin_name) {
      setCreateErr('Semua field wajib diisi'); return
    }
    setCreating(true); setCreateErr('')
    const res  = await fetch('/api/superadmin/clinics', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
    })
    const data = await res.json() as { success?: boolean; error?: string }
    if (res.ok) {
      setShowCreate(false)
      setForm({ name: '', slug: '', admin_email: '', admin_password: '', admin_name: '', plan: 'trial' })
      showToast('Klinik berhasil dibuat'); load()
    } else {
      setCreateErr(data.error ?? 'Gagal')
    }
    setCreating(false)
  }

  return (
    <div className="p-8">
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-gray-900 text-white px-5 py-3 rounded-2xl shadow-xl font-bold text-sm">
          {toast}
        </div>
      )}

      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Semua Klinik</h1>
          <p className="text-gray-500 text-sm mt-1">{clinics.length} klinik terdaftar</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-gray-700 transition-colors">
          <Plus size={14} /> Tambah Klinik
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-52">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Cari nama atau slug..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
        </div>
        <select value={planF} onChange={e => setPlanF(e.target.value)}
          className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Semua Plan</option>
          {['trial','basic','pro','custom'].map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={statusF} onChange={e => setStatusF(e.target.value)}
          className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Semua Status</option>
          <option value="active">Aktif</option>
          <option value="inactive">Nonaktif</option>
        </select>
        <button onClick={load} className="p-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
          <RefreshCw size={14} className={loading ? 'animate-spin text-blue-500' : 'text-gray-400'} />
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Nama Klinik', 'Slug', 'Telepon', 'Plan', 'Trial Habis', 'Pasien', 'Status', 'Aksi'].map(h => (
                  <th key={h} className="text-left text-[10px] uppercase tracking-widest font-bold text-gray-400 px-4 py-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={8} className="py-12 text-center text-sm text-gray-400">Memuat...</td></tr>
              ) : clinics.length === 0 ? (
                <tr><td colSpan={8} className="py-12 text-center text-sm text-gray-400">Tidak ada klinik</td></tr>
              ) : clinics.map(c => (
                <tr key={c.id} className={`hover:bg-gray-50 transition-colors ${!c.is_active ? 'opacity-60' : ''}`}>
                  <td className="px-4 py-3 font-bold text-gray-800">{c.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{c.slug}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{c.phone ?? '—'}</td>
                  <td className="px-4 py-3">
                    <select defaultValue={c.plan}
                      onChange={e => changePlan(c.id, e.target.value)}
                      className={`px-2 py-1 rounded-full text-xs font-bold border-0 cursor-pointer ${PLAN_BADGE[c.plan] ?? 'bg-gray-100 text-gray-600'}`}>
                      {['trial','basic','pro','custom'].map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </td>
                  <td className={`px-4 py-3 text-xs ${isExpired(c.plan_expires_at) ? 'text-red-500 font-bold' : 'text-gray-500'}`}>
                    {fmtDate(c.plan_expires_at)}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 font-bold">{c.patient_count}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${c.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                      {c.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 flex-wrap">
                      <button onClick={() => extendTrial(c.id)}
                        className="px-2 py-1 text-[10px] font-bold bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors whitespace-nowrap">
                        +14 Hari
                      </button>
                      <button onClick={() => impersonate(c.id)} disabled={impersonating === c.id}
                        className="px-2 py-1 text-[10px] font-bold bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors flex items-center gap-1 disabled:opacity-50 whitespace-nowrap">
                        <ExternalLink size={10} /> Masuk
                      </button>
                      <button onClick={() => c.is_active ? setConfirmDeactivate(c) : toggleActive(c)}
                        className={`px-2 py-1 text-[10px] font-bold rounded-lg transition-colors whitespace-nowrap ${c.is_active ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}>
                        {c.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-2xl p-7 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-black text-gray-900 text-lg">Tambah Klinik Manual</h3>
              <button onClick={() => setShowCreate(false)}><X size={16} className="text-gray-500" /></button>
            </div>
            <div className="space-y-3">
              {([
                { label: 'Nama Klinik', key: 'name', ph: 'Klinik Sehat' },
                { label: 'Slug',        key: 'slug', ph: 'klinik-sehat' },
                { label: 'Nama Admin',  key: 'admin_name', ph: 'Dr. Admin' },
                { label: 'Email Admin', key: 'admin_email', ph: 'admin@klinik.com' },
                { label: 'Password Admin', key: 'admin_password', ph: '••••••••' },
              ] as { label: string; key: keyof CreateForm; ph: string }[]).map(f => (
                <div key={f.key}>
                  <label className={LABEL}>{f.label}</label>
                  <input value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    type={f.key === 'admin_password' ? 'password' : 'text'} placeholder={f.ph} className={INPUT} />
                </div>
              ))}
              <div>
                <label className={LABEL}>Plan</label>
                <select value={form.plan} onChange={e => setForm(p => ({ ...p, plan: e.target.value }))} className={INPUT}>
                  {['trial','basic','pro','custom'].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              {createErr && <p className="text-sm text-red-600 font-medium">{createErr}</p>}
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowCreate(false)} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-200 transition-colors">Batal</button>
              <button onClick={handleCreate} disabled={creating} className="flex-1 py-3 bg-gray-900 text-white rounded-xl font-bold text-sm hover:bg-gray-700 transition-colors disabled:opacity-50">
                {creating ? 'Membuat...' : 'Buat Klinik'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deactivate confirm */}
      {confirmDeactivate && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setConfirmDeactivate(null)}>
          <div className="bg-white rounded-2xl p-7 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-black text-gray-900 text-lg mb-3">Nonaktifkan Klinik</h3>
            <p className="text-sm text-gray-500 mb-5">
              Yakin ingin menonaktifkan <strong>{confirmDeactivate.name}</strong>? Admin klinik tidak bisa login sampai diaktifkan kembali.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeactivate(null)} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-200 transition-colors">Batal</button>
              <button onClick={() => toggleActive(confirmDeactivate)} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 transition-colors">Nonaktifkan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
