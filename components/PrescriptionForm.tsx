'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, Plus, Trash2, AlertTriangle, Check, Download, Loader2 } from 'lucide-react'

type Medicine = { id: string; name: string; generic_name?: string | null; unit: string; stock: number; price: number }
type PItem = {
  medicine_id: string; medicine_name: string; medicine_unit: string; medicine_stock: number; medicine_price: number
  quantity: number; dosage: string; duration: string; notes: string
}
type Prescription = { id: string; status: string; prescription_number?: string; notes: string }

const DOSAGE_OPTS  = ['1×1', '2×1', '3×1', '4×1', 'sesuai kebutuhan']
const DURATION_OPTS = ['3 hari', '5 hari', '7 hari', '10 hari', '14 hari', '30 hari']
const INPUT = 'px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all w-full'

function fmtRupiah(n: number) { return 'Rp ' + n.toLocaleString('id-ID') }

export default function PrescriptionForm({ appointmentId, patientId, readonly = false }: {
  appointmentId: string; patientId: string; readonly?: boolean
}) {
  const [prescription,   setPrescription]   = useState<Prescription | null>(null)
  const [items,          setItems]          = useState<PItem[]>([])
  const [notes,          setNotes]          = useState('')
  const [search,         setSearch]         = useState('')
  const [results,        setResults]        = useState<Medicine[]>([])
  const [searching,      setSearching]      = useState(false)
  const [saving,         setSaving]         = useState(false)
  const [confirming,     setConfirming]     = useState(false)
  const [savedMsg,       setSavedMsg]       = useState('')
  const [loadingPre,     setLoadingPre]     = useState(true)

  // Load existing prescription
  useEffect(() => {
    fetch(`/api/doctor/prescriptions?appointment_id=${appointmentId}`)
      .then(r => r.json())
      .then(d => {
        const pre = d.prescription
        if (pre) {
          setPrescription({ id: pre.id, status: pre.status, prescription_number: pre.prescription_number, notes: pre.notes ?? '' })
          setNotes(pre.notes ?? '')
          setItems((pre.prescription_items ?? []).map((item: any) => ({
            medicine_id:    item.medicine_id,
            medicine_name:  item.medicines?.name ?? '',
            medicine_unit:  item.medicines?.unit ?? '',
            medicine_stock: item.medicines?.stock ?? 0,
            medicine_price: item.medicines?.price ?? 0,
            quantity:       item.quantity,
            dosage:         item.dosage,
            duration:       item.duration ?? '5 hari',
            notes:          item.notes ?? '',
          })))
        }
      })
      .catch(() => {})
      .finally(() => setLoadingPre(false))
  }, [appointmentId])

  // Search medicines
  useEffect(() => {
    if (!search.trim()) { setResults([]); return }
    const timer = setTimeout(async () => {
      setSearching(true)
      const res = await fetch(`/api/doctor/medicines?q=${encodeURIComponent(search)}`)
      const d   = await res.json() as { medicines?: Medicine[] }
      setResults(d.medicines ?? [])
      setSearching(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  function addItem(med: Medicine) {
    if (items.some(i => i.medicine_id === med.id)) return
    setItems(prev => [...prev, {
      medicine_id: med.id, medicine_name: med.name, medicine_unit: med.unit,
      medicine_stock: med.stock, medicine_price: med.price,
      quantity: 1, dosage: '3×1', duration: '5 hari', notes: '',
    }])
    setSearch(''); setResults([])
  }

  const updateItem = useCallback((idx: number, field: string, value: string | number) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item))
  }, [])

  async function handleSave(status: 'draft' | 'confirmed') {
    if (status === 'confirmed') setConfirming(true); else setSaving(true)
    const res = await fetch('/api/doctor/prescriptions', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appointment_id: appointmentId, patient_id: patientId, notes, status, items }),
    })
    const data = await res.json() as { success?: boolean; prescription_id?: string; prescription_number?: string; error?: string }
    if (res.ok) {
      const msg = status === 'confirmed' ? '✅ Resep dikonfirmasi' : '✅ Draft disimpan'
      setSavedMsg(msg); setTimeout(() => setSavedMsg(''), 3000)
      setPrescription(prev => ({
        id: data.prescription_id ?? prev?.id ?? '',
        status, prescription_number: data.prescription_number ?? prev?.prescription_number,
        notes,
      }))
    } else {
      alert(data.error ?? 'Gagal menyimpan resep')
    }
    setSaving(false); setConfirming(false)
  }

  const isReadonly   = readonly || prescription?.status === 'confirmed' || prescription?.status === 'dispensed'
  const isConfirmed  = prescription?.status === 'confirmed'
  const isDispensed  = prescription?.status === 'dispensed'
  const totalPrice   = items.reduce((sum, item) => sum + item.quantity * item.medicine_price, 0)
  const hasStockWarn = items.some(item => item.quantity > item.medicine_stock)

  if (loadingPre) return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mt-5 flex items-center justify-center">
      <Loader2 size={20} className="animate-spin text-primary mr-2" /><span className="text-sm text-muted-foreground">Memuat resep...</span>
    </div>
  )

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mt-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <h3 className="font-black text-secondary">Resep Obat</h3>
          {prescription?.prescription_number && (
            <span className="text-xs font-mono font-bold text-primary bg-primary/10 px-2 py-1 rounded-lg">
              {prescription.prescription_number}
            </span>
          )}
          {prescription?.status && (
            <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold capitalize ${
              isDispensed ? 'bg-emerald-100 text-emerald-700' :
              isConfirmed ? 'bg-blue-100 text-blue-700' :
              'bg-amber-100 text-amber-700'
            }`}>
              {isDispensed ? '✓ Dispensed' : isConfirmed ? 'Dikonfirmasi' : 'Draft'}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {(isConfirmed || isDispensed) && prescription?.id && (
            <a href={`/api/doctor/prescriptions/${prescription.id}/pdf`} target="_blank"
              className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-200 transition-colors">
              <Download size={12} /> PDF
            </a>
          )}
          {savedMsg && (
            <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-2 rounded-xl">
              <Check size={12} /> {savedMsg}
            </span>
          )}
        </div>
      </div>

      {/* Medicine search */}
      {!isReadonly && (
        <div className="mb-5 relative">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Cari nama obat untuk ditambahkan..."
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all" />
            {searching && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />}
          </div>
          {results.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
              {results.map(med => (
                <button key={med.id} type="button" onClick={() => addItem(med)}
                  className="w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0">
                  <div className="text-left">
                    <p className="font-bold text-gray-800">{med.name}</p>
                    {med.generic_name && <p className="text-xs text-gray-400">{med.generic_name}</p>}
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <p className={`text-xs font-bold ${med.stock <= 0 ? 'text-red-500' : med.stock <= 5 ? 'text-amber-500' : 'text-emerald-600'}`}>
                      Stok: {med.stock} {med.unit}
                    </p>
                    <p className="text-xs text-gray-400">{fmtRupiah(med.price)}</p>
                  </div>
                  <Plus size={14} className="text-primary ml-3 flex-shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Items list */}
      {items.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground border-2 border-dashed border-gray-200 rounded-xl">
          {isReadonly ? 'Tidak ada obat dalam resep' : 'Belum ada obat — cari dan tambahkan di atas'}
        </div>
      ) : (
        <div className="space-y-3 mb-5">
          {items.map((item, idx) => (
            <div key={idx} className={`rounded-xl border p-4 ${item.quantity > item.medicine_stock ? 'border-red-200 bg-red-50/50' : 'border-gray-100 bg-gray-50'}`}>
              <div className="flex items-start gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-800 text-sm">{item.medicine_name}</p>
                  <p className="text-xs text-gray-400">
                    Stok: {item.medicine_stock} {item.medicine_unit} · {fmtRupiah(item.medicine_price)}/unit
                    {item.quantity > item.medicine_stock && (
                      <span className="text-red-500 font-bold ml-2"><AlertTriangle size={10} className="inline" /> Stok tidak cukup!</span>
                    )}
                  </p>
                </div>
                {!isReadonly && (
                  <button type="button" onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))}
                    className="text-gray-300 hover:text-red-500 transition-colors p-1">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Qty</label>
                  <input type="number" min={1} value={item.quantity} disabled={isReadonly}
                    onChange={e => updateItem(idx, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                    className={`${INPUT} ${isReadonly ? 'bg-gray-100' : ''}`} />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Aturan Pakai</label>
                  {isReadonly
                    ? <p className="text-sm font-bold text-gray-700 py-2">{item.dosage}</p>
                    : <select value={item.dosage} onChange={e => updateItem(idx, 'dosage', e.target.value)} className={INPUT}>
                        {DOSAGE_OPTS.map(d => <option key={d} value={d}>{d}</option>)}
                        {!DOSAGE_OPTS.includes(item.dosage) && <option value={item.dosage}>{item.dosage}</option>}
                      </select>
                  }
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Durasi</label>
                  {isReadonly
                    ? <p className="text-sm font-bold text-gray-700 py-2">{item.duration || '—'}</p>
                    : <select value={item.duration} onChange={e => updateItem(idx, 'duration', e.target.value)} className={INPUT}>
                        {DURATION_OPTS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                  }
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Catatan</label>
                  <input value={item.notes} disabled={isReadonly}
                    onChange={e => updateItem(idx, 'notes', e.target.value)}
                    placeholder="sesudah makan..." className={`${INPUT} ${isReadonly ? 'bg-gray-100' : ''}`} />
                </div>
              </div>
            </div>
          ))}

          {/* Total */}
          {totalPrice > 0 && (
            <div className="text-right text-sm text-gray-500">
              Estimasi total: <span className="font-black text-gray-900">{fmtRupiah(totalPrice)}</span>
            </div>
          )}
        </div>
      )}

      {/* Doctor notes */}
      {!isReadonly && (
        <div className="mb-5">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Catatan Umum Dokter</label>
          <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Instruksi umum untuk pasien atau apoteker..."
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all resize-none" />
        </div>
      )}
      {isReadonly && prescription?.notes && (
        <div className="mb-5 bg-gray-50 rounded-xl p-3 text-sm text-gray-600">
          <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Catatan Dokter</p>
          {prescription.notes}
        </div>
      )}

      {/* Warnings */}
      {hasStockWarn && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-sm text-red-600 font-medium">
          <AlertTriangle size={14} /> Ada obat yang melebihi stok tersedia
        </div>
      )}

      {/* Actions */}
      {!isReadonly && (
        <div className="flex gap-3">
          <button type="button" onClick={() => handleSave('draft')} disabled={saving || items.length === 0}
            className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-200 transition-colors disabled:opacity-50">
            {saving ? <><Loader2 size={13} className="inline animate-spin mr-1" />Menyimpan...</> : 'Simpan Draft'}
          </button>
          <button type="button" onClick={() => handleSave('confirmed')} disabled={confirming || items.length === 0 || hasStockWarn}
            className="flex-1 py-2.5 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary-hover transition-colors disabled:opacity-50">
            {confirming ? <><Loader2 size={13} className="inline animate-spin mr-1" />Mengkonfirmasi...</> : '✓ Finalisasi Resep'}
          </button>
        </div>
      )}
    </div>
  )
}
