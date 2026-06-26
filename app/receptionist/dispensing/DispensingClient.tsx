'use client'

import { useState, useEffect, useCallback } from 'react'
import { Pill, ChevronDown, ChevronUp, AlertTriangle, RefreshCw, X } from 'lucide-react'

type PItem = {
  id: string; quantity: number; dosage: string; duration: string | null; medicine_id: string
  medicines: { name: string; unit: string; stock: number; price: number } | null
}
type Prescription = {
  id: string; status: string; prescription_number: string | null; notes: string | null; created_at: string
  patients: { full_name: string; no_rm: string; phone: string | null } | null
  prescription_items: PItem[]
  appointments: { scheduled_at: string; doctors: { full_name: string } | null } | null
}

function fmtTime(iso: string) {
  return new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
}
function fmtRupiah(n: number) { return 'Rp ' + n.toLocaleString('id-ID') }

export default function DispensingPage() {
  const [prescriptions, setPrescriptions]   = useState<Prescription[]>([])
  const [loading,       setLoading]         = useState(true)
  const [tab,           setTab]             = useState<'pending' | 'done'>('pending')
  const [expanded,      setExpanded]        = useState<string | null>(null)
  const [toast,         setToast]           = useState<string | null>(null)
  const [confirmId,     setConfirmId]       = useState<string | null>(null)
  const [dispatching,   setDispatching]     = useState(false)

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 4000) }

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/receptionist/dispensing')
    const d   = await res.json() as { prescriptions?: Prescription[] }
    setPrescriptions(d.prescriptions ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(load, 30_000)
    return () => clearInterval(id)
  }, [load])

  async function handleDispense() {
    if (!confirmId) return
    setDispatching(true)
    const res = await fetch('/api/receptionist/dispensing', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prescription_id: confirmId }),
    })
    const data = await res.json() as { success?: boolean; error?: string; items?: any[] }
    if (res.ok) {
      showToast('Obat berhasil dikeluarkan')
      setConfirmId(null)
      load()
    } else if (data.items) {
      alert(`Stok tidak cukup:\n${(data.items as any[]).map((i: any) => `• ${i.name}: ada ${i.stock}, butuh ${i.needed}`).join('\n')}`)
    } else {
      showToast(data.error ?? 'Gagal mengeluarkan obat')
    }
    setDispatching(false)
  }

  const pending  = prescriptions.filter(p => p.status === 'confirmed')
  const done     = prescriptions.filter(p => p.status === 'dispensed')
  const list     = tab === 'pending' ? pending : done

  return (
    <div>
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-gray-900 text-white px-5 py-3 rounded-2xl shadow-xl font-bold text-sm">{toast}</div>
      )}

      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-secondary">Obat & Resep</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Keluarkan obat berdasarkan resep dokter</p>
        </div>
        <button onClick={load} className="p-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
          <RefreshCw size={14} className={loading ? 'animate-spin text-primary' : 'text-gray-400'} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-5">
        {[
          { id: 'pending', label: `Menunggu Dikeluarkan (${pending.length})` },
          { id: 'done',    label: `Sudah Dikeluarkan (${done.length})` },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${tab === t.id ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-16 text-center text-muted-foreground text-sm">Memuat...</div>
      ) : list.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center border border-gray-100 text-sm text-muted-foreground">
          <Pill size={28} className="mx-auto mb-3 text-gray-300" />
          {tab === 'pending' ? 'Tidak ada resep menunggu' : 'Tidak ada resep yang sudah dikeluarkan hari ini'}
        </div>
      ) : (
        <div className="space-y-3">
          {list.map(p => {
            const patient = p.patients as any
            const apt     = p.appointments as any
            const isExpanded = expanded === p.id
            const items = p.prescription_items ?? []
            const hasStockWarn = items.some((item: any) => (item.medicines?.stock ?? 0) < item.quantity)
            const totalPrice   = items.reduce((sum: number, item: any) => sum + item.quantity * (item.medicines?.price ?? 0), 0)

            return (
              <div key={p.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${hasStockWarn ? 'border-red-200' : 'border-gray-100'}`}>
                <div className="p-5 flex items-center gap-4 flex-wrap cursor-pointer" onClick={() => setExpanded(isExpanded ? null : p.id)}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <p className="font-black text-secondary">{patient?.full_name}</p>
                      {p.prescription_number && (
                        <span className="text-[10px] font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">{p.prescription_number}</span>
                      )}
                      {hasStockWarn && <AlertTriangle size={14} className="text-red-500" />}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {patient?.no_rm} · {apt?.scheduled_at ? fmtTime(apt.scheduled_at) : '—'} · dr. {apt?.doctors?.full_name ?? '—'}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{items.length} item obat · {fmtRupiah(totalPrice)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {tab === 'pending' && (
                      <button type="button" onClick={e => { e.stopPropagation(); setConfirmId(p.id) }}
                        className="flex items-center gap-1.5 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary-hover transition-colors whitespace-nowrap">
                        <Pill size={13} /> Keluarkan Obat
                      </button>
                    )}
                    {tab === 'done' && (
                      <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-xl">✓ Selesai</span>
                    )}
                    {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                  </div>
                </div>

                {/* Expanded items */}
                {isExpanded && (
                  <div className="border-t border-gray-100 px-5 pb-4 pt-3">
                    <div className="space-y-2">
                      {items.map((item: any, i: number) => {
                        const med = item.medicines as any
                        const insufficient = (med?.stock ?? 0) < item.quantity
                        return (
                          <div key={i} className={`flex items-center gap-4 p-3 rounded-xl text-sm ${insufficient ? 'bg-red-50 border border-red-200' : 'bg-gray-50'}`}>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-gray-800">{med?.name ?? '—'}</p>
                              <p className="text-xs text-gray-500">{item.dosage} · {item.duration ?? '—'}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className={`text-sm font-bold ${insufficient ? 'text-red-600' : 'text-gray-700'}`}>
                                {item.quantity} {med?.unit}
                              </p>
                              {insufficient && <p className="text-xs text-red-500">Stok: {med?.stock ?? 0}</p>}
                              {!insufficient && <p className="text-xs text-gray-400">Stok: {med?.stock ?? 0}</p>}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    {p.notes && (
                      <div className="mt-3 text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
                        <span className="font-bold text-gray-400 uppercase tracking-widest text-[10px]">Catatan Dokter: </span>
                        {p.notes}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Confirm modal */}
      {confirmId && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setConfirmId(null)}>
          <div className="bg-white rounded-2xl p-7 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-gray-900 text-lg">Konfirmasi</h3>
              <button onClick={() => setConfirmId(null)}><X size={16} className="text-gray-400" /></button>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              Yakin keluarkan semua obat untuk resep ini? Stok obat akan langsung berkurang.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmId(null)} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm">Batal</button>
              <button onClick={handleDispense} disabled={dispatching}
                className="flex-1 py-3 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary-hover transition-colors disabled:opacity-50">
                {dispatching ? 'Memproses...' : '✓ Keluarkan Obat'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
