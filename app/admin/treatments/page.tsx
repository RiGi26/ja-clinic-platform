'use client'

import { useState, useEffect, useCallback } from 'react'
import TopBar from '@/components/TopBar'
import { Plus, Pencil, PowerOff, Database, X } from 'lucide-react'

const INPUT = 'w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all'
const LABEL = 'text-[10px] uppercase tracking-widest font-bold text-muted-foreground block mb-2'

type Treatment = {
  id: string; name: string; category: string; price: number
  description: string | null; is_active: boolean; created_at: string
}

const CATEGORIES = [
  { value: '',            label: 'Semua'       },
  { value: 'umum',        label: 'Umum'        },
  { value: 'tindakan',    label: 'Tindakan'    },
  { value: 'laboratorium',label: 'Laboratorium'},
  { value: 'obat',        label: 'Obat'        },
  { value: 'lainnya',     label: 'Lainnya'     },
]

const CAT_COLORS: Record<string, string> = {
  umum:         'bg-blue-100 text-blue-700',
  tindakan:     'bg-violet-100 text-violet-700',
  laboratorium: 'bg-amber-100 text-amber-700',
  obat:         'bg-green-100 text-green-700',
  lainnya:      'bg-gray-100 text-gray-600',
}

const SEED_DATA = [
  { name: 'Konsultasi Umum',           category: 'umum',         price: 50000  },
  { name: 'Konsultasi Spesialis',      category: 'umum',         price: 150000 },
  { name: 'Injeksi IV',                category: 'tindakan',     price: 75000  },
  { name: 'Pemasangan Infus',          category: 'tindakan',     price: 100000 },
  { name: 'Pemeriksaan Darah Lengkap', category: 'laboratorium', price: 120000 },
  { name: 'Gula Darah Sewaktu',        category: 'laboratorium', price: 30000  },
  { name: 'Asam Urat',                 category: 'laboratorium', price: 35000  },
]

function fmtRupiah(n: number) { return 'Rp ' + n.toLocaleString('id-ID') }

type FormState = { name: string; category: string; price: string; description: string }
const DEFAULT_FORM: FormState = { name: '', category: 'umum', price: '', description: '' }

export default function TreatmentsPage() {
  const [treatments, setTreatments] = useState<Treatment[]>([])
  const [catFilter, setCatFilter]   = useState('')
  const [loading, setLoading]       = useState(true)
  const [seeding, setSeeding]       = useState(false)
  const [toast, setToast]           = useState<string | null>(null)

  const [modal, setModal]           = useState<{ mode: 'add' | 'edit'; item?: Treatment } | null>(null)
  const [form, setForm]             = useState<FormState>(DEFAULT_FORM)
  const [saving, setSaving]         = useState(false)
  const [formErr, setFormErr]       = useState('')

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const load = useCallback(async () => {
    setLoading(true)
    const url = catFilter ? `/api/admin/treatments?category=${catFilter}` : '/api/admin/treatments'
    const res = await fetch(url)
    const d   = await res.json() as { treatments?: Treatment[] }
    setTreatments(d.treatments ?? [])
    setLoading(false)
  }, [catFilter])

  useEffect(() => { load() }, [load])

  function openAdd() {
    setForm(DEFAULT_FORM)
    setFormErr('')
    setModal({ mode: 'add' })
  }

  function openEdit(item: Treatment) {
    setForm({ name: item.name, category: item.category, price: String(item.price), description: item.description ?? '' })
    setFormErr('')
    setModal({ mode: 'edit', item })
  }

  async function handleSave() {
    if (!form.name.trim()) { setFormErr('Nama tindakan wajib diisi'); return }
    const price = parseInt(form.price)
    if (isNaN(price) || price < 0) { setFormErr('Harga harus angka >= 0'); return }
    setSaving(true)
    setFormErr('')

    const payload = { name: form.name, category: form.category, price, description: form.description }

    if (modal?.mode === 'add') {
      const res = await fetch('/api/admin/treatments', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      })
      if (res.ok) { showToast('Tindakan berhasil ditambahkan'); setModal(null); load() }
      else { const d = await res.json() as { error?: string }; setFormErr(d.error ?? 'Gagal menyimpan') }
    } else if (modal?.mode === 'edit' && modal.item) {
      const res = await fetch(`/api/admin/treatments/${modal.item.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      })
      if (res.ok) { showToast('Tindakan berhasil diperbarui'); setModal(null); load() }
      else { const d = await res.json() as { error?: string }; setFormErr(d.error ?? 'Gagal menyimpan') }
    }
    setSaving(false)
  }

  async function handleToggle(item: Treatment) {
    await fetch(`/api/admin/treatments/${item.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !item.is_active }),
    })
    showToast(item.is_active ? 'Tindakan dinonaktifkan' : 'Tindakan diaktifkan')
    load()
  }

  async function handleSeed() {
    if (!confirm('Tambahkan 7 tindakan default? Duplikat tidak akan ditambahkan.')) return
    setSeeding(true)
    for (const item of SEED_DATA) {
      await fetch('/api/admin/treatments', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(item),
      })
    }
    setSeeding(false)
    showToast('Seed data berhasil ditambahkan')
    load()
  }

  const displayed = catFilter
    ? treatments.filter(t => t.category === catFilter)
    : treatments

  return (
    <div className="min-h-screen bg-background">
      <TopBar title="Katalog Tindakan & Tarif" subtitle="Kelola tindakan dan harga layanan klinik" />

      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl font-bold text-sm">
          ✅ {toast}
        </div>
      )}

      <div className="p-8">
        {/* Header actions */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map(c => (
              <button key={c.value} onClick={() => setCatFilter(c.value)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                  catFilter === c.value ? 'bg-primary text-white shadow-sm' : 'bg-white border border-gray-200 text-secondary hover:border-primary hover:text-primary'
                }`}>
                {c.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={handleSeed} disabled={seeding}
              className="flex items-center gap-1.5 px-4 py-2.5 border border-gray-200 rounded-xl text-secondary text-sm font-bold hover:bg-gray-50 transition-colors disabled:opacity-50">
              <Database size={14} /> {seeding ? 'Menambahkan...' : 'Seed Default'}
            </button>
            <button onClick={openAdd}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary-hover transition-colors shadow-sm">
              <Plus size={14} /> Tambah Tindakan
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-sm text-muted-foreground">Memuat...</div>
          ) : displayed.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-4xl mb-3">🏥</p>
              <p className="text-sm font-semibold text-muted-foreground mb-2">Belum ada tindakan</p>
              <p className="text-xs text-muted-foreground">Klik &ldquo;Seed Default&rdquo; untuk menambahkan tindakan umum</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left text-[10px] uppercase tracking-widest font-bold text-muted-foreground px-5 py-3">Nama Tindakan</th>
                    <th className="text-left text-[10px] uppercase tracking-widest font-bold text-muted-foreground px-3 py-3">Kategori</th>
                    <th className="text-right text-[10px] uppercase tracking-widest font-bold text-muted-foreground px-3 py-3">Harga</th>
                    <th className="text-center text-[10px] uppercase tracking-widest font-bold text-muted-foreground px-3 py-3">Status</th>
                    <th className="text-center text-[10px] uppercase tracking-widest font-bold text-muted-foreground px-5 py-3">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {displayed.map(t => (
                    <tr key={t.id} className={`hover:bg-gray-50 transition-colors ${!t.is_active ? 'opacity-50' : ''}`}>
                      <td className="px-5 py-3">
                        <p className="font-bold text-secondary">{t.name}</p>
                        {t.description && <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>}
                      </td>
                      <td className="px-3 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize ${CAT_COLORS[t.category] ?? 'bg-gray-100 text-gray-600'}`}>
                          {t.category}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right font-black text-secondary tabular-nums">{fmtRupiah(t.price)}</td>
                      <td className="px-3 py-3 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${t.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                          {t.is_active ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => openEdit(t)} title="Edit"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/10 transition-colors">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => handleToggle(t)} title={t.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                            className={`p-1.5 rounded-lg transition-colors ${t.is_active ? 'text-gray-400 hover:text-destructive hover:bg-destructive/10' : 'text-gray-400 hover:text-emerald-600 hover:bg-emerald-50'}`}>
                            <PowerOff size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl p-7 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black text-secondary">
                {modal.mode === 'add' ? 'Tambah Tindakan' : 'Edit Tindakan'}
              </h3>
              <button onClick={() => setModal(null)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                <X size={16} className="text-secondary" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className={LABEL}>Nama Tindakan *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Konsultasi Umum, Injeksi IV..." className={INPUT} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={LABEL}>Kategori</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className={INPUT}>
                    {CATEGORIES.filter(c => c.value).map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={LABEL}>Harga (Rp)</label>
                  <input type="number" min={0} value={form.price}
                    onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                    placeholder="50000" className={INPUT} />
                  {form.price && !isNaN(parseInt(form.price)) && (
                    <p className="text-xs text-primary font-bold mt-1">{fmtRupiah(parseInt(form.price))}</p>
                  )}
                </div>
              </div>
              <div>
                <label className={LABEL}>Deskripsi (opsional)</label>
                <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Keterangan singkat..." className={INPUT} />
              </div>
              {formErr && <p className="text-sm text-destructive font-medium">{formErr}</p>}
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setModal(null)}
                className="flex-1 py-3 bg-gray-100 text-secondary rounded-xl font-bold text-sm hover:bg-gray-200 transition-colors">
                Batal
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-3 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary-hover transition-colors disabled:opacity-50">
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
