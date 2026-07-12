'use client'

import { useState, useEffect, useCallback } from 'react'
import TopBar from '@/components/TopBar'
import { Search, Plus, X, AlertTriangle, ArrowUp, ArrowDown, History, RefreshCw } from 'lucide-react'

const INPUT = 'w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all'
const LABEL = 'text-[10px] uppercase tracking-widest font-bold text-muted-foreground block mb-2'

type Medicine = {
  id: string; name: string; generic_name: string | null; category: string
  unit: string; stock: number; min_stock: number; price: number; is_active: boolean
}
type Transaction = {
  id: string; type: string; quantity: number; stock_before: number; stock_after: number
  reference: string | null; notes: string | null; created_at: string
}

const CAT_BADGE: Record<string, string> = {
  obat:     'bg-blue-100 text-blue-700',
  vitamin:  'bg-green-100 text-green-700',
  alkes:    'bg-purple-100 text-purple-700',
  lainnya:  'bg-gray-100 text-gray-600',
}

function fmtRupiah(n: number) {
  if (n === 0) return '—'
  return 'Rp ' + n.toLocaleString('id-ID')
}
function fmtDate(iso: string) {
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
}

export default function MedicinesPage() {
  const [medicines,    setMedicines]    = useState<Medicine[]>([])
  const [loading,      setLoading]      = useState(true)
  const [lowCount,     setLowCount]     = useState(0)
  const [search,       setSearch]       = useState('')
  const [catF,         setCatF]         = useState('')
  const [lowOnly,      setLowOnly]      = useState(false)
  const [toast,        setToast]        = useState<string | null>(null)

  const [addModal,     setAddModal]     = useState(false)
  const [inModal,      setInModal]      = useState<Medicine | null>(null)
  const [outModal,     setOutModal]     = useState<Medicine | null>(null)
  const [histModal,    setHistModal]    = useState<Medicine | null>(null)
  const [histData,     setHistData]     = useState<Transaction[]>([])
  const [histLoading,  setHistLoading]  = useState(false)

  const [addForm, setAddForm] = useState({ name:'', generic_name:'', category:'obat', unit:'tablet', stock:'0', min_stock:'10', price:'0', description:'' })
  const [stockForm, setStockForm] = useState({ quantity:'', reference:'', notes:'' })
  const [submitting, setSubmitting] = useState(false)

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 3000) }

  const load = useCallback(async () => {
    setLoading(true)
    const p = new URLSearchParams()
    if (search)  p.set('search', search)
    if (catF)    p.set('category', catF)
    if (lowOnly) p.set('low_stock', 'true')
    const res = await fetch(`/api/admin/medicines?${p}`)
    const d   = await res.json() as { data?: Medicine[]; low_stock_count?: number }
    setMedicines(d.data ?? [])
    setLowCount(d.low_stock_count ?? 0)
    setLoading(false)
  }, [search, catF, lowOnly])

  useEffect(() => { load() }, [load])

  async function handleAdd() {
    if (!addForm.name.trim()) return
    setSubmitting(true)
    await fetch('/api/admin/medicines', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...addForm, stock: parseInt(addForm.stock)||0, min_stock: parseInt(addForm.min_stock)||10, price: parseInt(addForm.price)||0 }),
    })
    showToast('Obat berhasil ditambahkan')
    setAddModal(false)
    setAddForm({ name:'', generic_name:'', category:'obat', unit:'tablet', stock:'0', min_stock:'10', price:'0', description:'' })
    load()
    setSubmitting(false)
  }

  async function handleStock(type: 'masuk' | 'keluar', medicine: Medicine) {
    if (!stockForm.quantity) return
    setSubmitting(true)
    const res = await fetch(`/api/admin/medicines/${medicine.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, quantity: parseInt(stockForm.quantity), reference: stockForm.reference||undefined, notes: stockForm.notes||undefined }),
    })
    const data = await res.json() as { error?: string }
    if (res.ok) {
      showToast(`Stok ${type === 'masuk' ? 'masuk' : 'keluar'} berhasil dicatat`)
      setInModal(null); setOutModal(null)
      setStockForm({ quantity:'', reference:'', notes:'' })
      load()
    } else {
      showToast(data.error ?? 'Gagal')
    }
    setSubmitting(false)
  }

  async function loadHistory(medicine: Medicine) {
    setHistModal(medicine); setHistLoading(true)
    const res = await fetch(`/api/admin/medicines/${medicine.id}`)
    const d   = await res.json() as { transactions?: Transaction[] }
    setHistData(d.transactions ?? [])
    setHistLoading(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Hapus obat ini?')) return
    await fetch(`/api/admin/medicines/${id}`, { method: 'DELETE' })
    showToast('Obat dihapus')
    load()
  }

  return (
    <div className="min-h-screen bg-background">
      <TopBar title="Stok Obat & Alkes" subtitle="Manajemen inventaris farmasi" showSearch={false} />
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-gray-900 text-white px-5 py-3 rounded-2xl shadow-xl font-bold text-sm">{toast}</div>
      )}

      <div className="p-8">
        {/* Low stock banner */}
        {lowCount > 0 && (
          <button onClick={() => setLowOnly(v => !v)}
            className={`w-full flex items-center gap-3 p-4 rounded-2xl mb-5 text-left transition-all ${lowOnly ? 'bg-amber-500 text-white' : 'bg-amber-50 border border-amber-200'}`}>
            <AlertTriangle size={18} className={lowOnly ? 'text-white' : 'text-amber-600'} />
            <span className={`font-bold text-sm ${lowOnly ? 'text-white' : 'text-amber-700'}`}>
              ⚠️ {lowCount} obat stok menipis — perlu restock
            </span>
            <span className={`ml-auto text-xs font-bold ${lowOnly ? 'text-white/80' : 'text-amber-500'}`}>
              {lowOnly ? 'Tampilkan semua' : 'Filter sekarang'}
            </span>
          </button>
        )}

        {/* Filter bar */}
        <div className="flex flex-wrap gap-3 mb-5 items-center">
          <div className="relative flex-1 min-w-52">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari obat..."
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white" />
          </div>
          <select value={catF} onChange={e => setCatF(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none">
            <option value="">Semua Kategori</option>
            {['obat','vitamin','alkes','lainnya'].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button onClick={load} className="p-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
            <RefreshCw size={14} className={loading ? 'animate-spin text-primary' : 'text-gray-400'} />
          </button>
          <button onClick={() => setAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary-hover transition-colors">
            <Plus size={14} /> Tambah Obat
          </button>
        </div>

        {/* Mobile cards — 6 kolom tabel tidak muat di layar sempit */}
        <div className="lg:hidden space-y-3">
          {loading ? (
            <div className="bg-white rounded-2xl border border-gray-100 py-12 text-center text-sm text-gray-400">Memuat...</div>
          ) : medicines.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 py-12 text-center text-sm text-gray-400">Belum ada obat</div>
          ) : medicines.map(m => {
            const isLow = m.stock <= m.min_stock
            return (
              <div key={m.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-gray-800 truncate">{m.name}</p>
                    {m.generic_name && <p className="text-xs text-gray-400 truncate">{m.generic_name}</p>}
                  </div>
                  <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-bold capitalize ${CAT_BADGE[m.category] ?? 'bg-gray-100 text-gray-600'}`}>
                    {m.category}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-0.5">Stok</p>
                    <p className={`text-sm font-bold ${isLow ? 'text-red-500' : 'text-gray-800'}`}>
                      {isLow && <AlertTriangle size={12} className="inline mr-1" />}
                      {m.stock} {m.unit}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-0.5">Min. Stok</p>
                    <p className="text-sm text-gray-500">{m.min_stock} {m.unit}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-0.5">Harga</p>
                    <p className="text-sm text-gray-600">{fmtRupiah(m.price)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-50">
                  <button onClick={() => { setStockForm({ quantity:'', reference:'', notes:'' }); setInModal(m) }}
                    className="flex flex-1 items-center justify-center gap-1 px-2 py-2.5 min-h-[44px] text-xs font-bold bg-emerald-100 text-emerald-700 rounded-lg active:scale-95 transition-transform">
                    <ArrowUp size={12} /> Masuk
                  </button>
                  <button onClick={() => { setStockForm({ quantity:'', reference:'', notes:'' }); setOutModal(m) }}
                    className="flex flex-1 items-center justify-center gap-1 px-2 py-2.5 min-h-[44px] text-xs font-bold bg-red-100 text-red-600 rounded-lg active:scale-95 transition-transform">
                    <ArrowDown size={12} /> Keluar
                  </button>
                  <button onClick={() => loadHistory(m)}
                    className="flex flex-1 items-center justify-center gap-1 px-2 py-2.5 min-h-[44px] text-xs font-bold bg-gray-100 text-gray-600 rounded-lg active:scale-95 transition-transform">
                    <History size={12} /> Riwayat
                  </button>
                  <button onClick={() => handleDelete(m.id)} aria-label={`Hapus ${m.name}`}
                    className="flex items-center justify-center min-h-[44px] min-w-[44px] text-gray-300 hover:text-red-500 transition-colors">
                    <X size={16} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Table (desktop) */}
        <div className="hidden lg:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Nama Obat', 'Kategori', 'Stok', 'Min. Stok', 'Harga', 'Aksi'].map(h => (
                    <th key={h} className="text-left text-[10px] uppercase tracking-widest font-bold text-gray-400 px-5 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td colSpan={6} className="py-12 text-center text-sm text-gray-400">Memuat...</td></tr>
                ) : medicines.length === 0 ? (
                  <tr><td colSpan={6} className="py-12 text-center text-sm text-gray-400">Belum ada obat</td></tr>
                ) : medicines.map(m => {
                  const isLow = m.stock <= m.min_stock
                  return (
                    <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3">
                        <p className="font-bold text-gray-800">{m.name}</p>
                        {m.generic_name && <p className="text-xs text-gray-400">{m.generic_name}</p>}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize ${CAT_BADGE[m.category] ?? 'bg-gray-100 text-gray-600'}`}>
                          {m.category}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`font-bold text-sm ${isLow ? 'text-red-500' : 'text-gray-800'}`}>
                          {isLow && <AlertTriangle size={12} className="inline mr-1" />}
                          {m.stock} {m.unit}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-500">{m.min_stock} {m.unit}</td>
                      <td className="px-5 py-3 text-sm text-gray-600">{fmtRupiah(m.price)}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1 flex-wrap">
                          <button onClick={() => { setStockForm({ quantity:'', reference:'', notes:'' }); setInModal(m) }}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-bold bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors whitespace-nowrap">
                            <ArrowUp size={10} /> Masuk
                          </button>
                          <button onClick={() => { setStockForm({ quantity:'', reference:'', notes:'' }); setOutModal(m) }}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-bold bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors whitespace-nowrap">
                            <ArrowDown size={10} /> Keluar
                          </button>
                          <button onClick={() => loadHistory(m)}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-bold bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors whitespace-nowrap">
                            <History size={10} /> Riwayat
                          </button>
                          <button onClick={() => handleDelete(m.id)}
                            className="p-1.5 text-gray-300 hover:text-red-500 transition-colors">
                            <X size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Medicine Modal */}
      {addModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setAddModal(false)}>
          <div className="bg-white rounded-2xl p-7 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-black text-gray-900 text-lg">Tambah Obat</h3>
              <button onClick={() => setAddModal(false)}><X size={16} className="text-gray-500" /></button>
            </div>
            <div className="space-y-3">
              <div><label className={LABEL}>Nama Obat *</label><input value={addForm.name} onChange={e => setAddForm(f=>({...f,name:e.target.value}))} className={INPUT} placeholder="Nama obat..." /></div>
              <div><label className={LABEL}>Nama Generik</label><input value={addForm.generic_name} onChange={e => setAddForm(f=>({...f,generic_name:e.target.value}))} className={INPUT} placeholder="Opsional" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={LABEL}>Kategori</label>
                  <select value={addForm.category} onChange={e => setAddForm(f=>({...f,category:e.target.value}))} className={INPUT}>
                    {['obat','vitamin','alkes','lainnya'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className={LABEL}>Satuan</label>
                  <select value={addForm.unit} onChange={e => setAddForm(f=>({...f,unit:e.target.value}))} className={INPUT}>
                    {['tablet','kapsul','botol','ampul','sachet','tube','strip','lainnya'].map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className={LABEL}>Stok Awal</label><input type="number" min={0} value={addForm.stock} onChange={e => setAddForm(f=>({...f,stock:e.target.value}))} className={INPUT} /></div>
                <div><label className={LABEL}>Min. Stok</label><input type="number" min={0} value={addForm.min_stock} onChange={e => setAddForm(f=>({...f,min_stock:e.target.value}))} className={INPUT} /></div>
                <div><label className={LABEL}>Harga / Unit</label><input type="number" min={0} value={addForm.price} onChange={e => setAddForm(f=>({...f,price:e.target.value}))} className={INPUT} /></div>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setAddModal(false)} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm">Batal</button>
              <button onClick={handleAdd} disabled={submitting || !addForm.name.trim()}
                className="flex-1 py-3 bg-primary text-white rounded-xl font-bold text-sm disabled:opacity-50">
                {submitting ? 'Menyimpan...' : 'Tambah Obat'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock In/Out Modal */}
      {(inModal || outModal) && (() => {
        const m    = inModal ?? outModal!
        const type = inModal ? 'masuk' : 'keluar'
        return (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => { setInModal(null); setOutModal(null) }}>
            <div className="bg-white rounded-2xl p-7 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-black text-gray-900 text-lg">Stok {type === 'masuk' ? 'Masuk' : 'Keluar'}</h3>
                <button onClick={() => { setInModal(null); setOutModal(null) }}><X size={16} className="text-gray-500" /></button>
              </div>
              <p className="text-sm text-gray-500 mb-4">Obat: <strong>{m.name}</strong> (Stok: {m.stock} {m.unit})</p>
              <div className="space-y-3">
                <div><label className={LABEL}>Jumlah *</label><input type="number" min={1} value={stockForm.quantity} onChange={e => setStockForm(f=>({...f,quantity:e.target.value}))} className={INPUT} /></div>
                <div><label className={LABEL}>Referensi</label><input value={stockForm.reference} onChange={e => setStockForm(f=>({...f,reference:e.target.value}))} className={INPUT} placeholder="Nama supplier / No. resep..." /></div>
                <div><label className={LABEL}>Catatan</label><input value={stockForm.notes} onChange={e => setStockForm(f=>({...f,notes:e.target.value}))} className={INPUT} placeholder="Opsional..." /></div>
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={() => { setInModal(null); setOutModal(null) }} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm">Batal</button>
                <button onClick={() => handleStock(type, m)} disabled={submitting || !stockForm.quantity}
                  className={`flex-1 py-3 text-white rounded-xl font-bold text-sm disabled:opacity-50 ${type === 'masuk' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}>
                  {submitting ? 'Menyimpan...' : `Catat Stok ${type === 'masuk' ? 'Masuk' : 'Keluar'}`}
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Transaction History Slideover */}
      {histModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-end" onClick={() => setHistModal(null)}>
          <div className="bg-white h-full w-full max-w-md shadow-2xl overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div>
                <h3 className="font-black text-gray-900">Riwayat Transaksi</h3>
                <p className="text-xs text-gray-400 mt-0.5">{histModal.name}</p>
              </div>
              <button onClick={() => setHistModal(null)}><X size={18} className="text-gray-400" /></button>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-6 mb-6 p-4 bg-gray-50 rounded-xl">
                <div><p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Stok Saat Ini</p><p className="text-2xl font-black text-gray-900">{histModal.stock} {histModal.unit}</p></div>
                <div><p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Min. Stok</p><p className="text-2xl font-black text-gray-900">{histModal.min_stock}</p></div>
              </div>
              {histLoading ? (
                <p className="text-center text-gray-400 text-sm py-8">Memuat...</p>
              ) : histData.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-8">Belum ada transaksi</p>
              ) : (
                <div className="space-y-3">
                  {histData.map(t => (
                    <div key={t.id} className="flex items-center gap-4 p-4 border border-gray-100 rounded-xl">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${t.type === 'masuk' ? 'bg-emerald-100' : t.type === 'keluar' ? 'bg-red-100' : 'bg-gray-100'}`}>
                        {t.type === 'masuk' ? <ArrowUp size={14} className="text-emerald-600" /> : t.type === 'keluar' ? <ArrowDown size={14} className="text-red-600" /> : <RefreshCw size={14} className="text-gray-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-bold capitalize ${t.type === 'masuk' ? 'text-emerald-600' : t.type === 'keluar' ? 'text-red-600' : 'text-gray-500'}`}>{t.type}</span>
                          <span className="text-xs font-black text-gray-900">{t.type === 'masuk' ? '+' : t.type === 'keluar' ? '-' : ''}{t.quantity}</span>
                        </div>
                        <p className="text-[11px] text-gray-400 mt-0.5">{t.stock_before} → {t.stock_after} {histModal.unit}</p>
                        {t.reference && <p className="text-[11px] text-gray-500 truncate">{t.reference}</p>}
                        <p className="text-[10px] text-gray-300 mt-0.5">{fmtDate(t.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
