'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, Plus, Trash2, AlertTriangle, Check, Download, Loader2, Pill } from 'lucide-react'
import { triggerHaptic, Skeleton } from '@/lib/ux-utils'

type Medicine = { id: string; name: string; generic_name?: string | null; unit: string; stock: number; price: number }
type PItem = {
  medicine_id: string; medicine_name: string; medicine_unit: string; medicine_stock: number; medicine_price: number
  quantity: number; dosage: string; duration: string; notes: string
}
type Prescription = { id: string; status: string; prescription_number?: string; notes: string }

const DOSAGE_OPTS  = ['1×1', '2×1', '3×1', '4×1', 'sesuai kebutuhan']
const DURATION_OPTS = ['3 hari', '5 hari', '7 hari', '10 hari', '14 hari', '30 hari']
const INPUT = 'px-4 py-3 min-h-[44px] bg-[#F5F5F7] border border-transparent rounded-xl text-sm sf-display text-[#1D1D1F] focus:outline-none focus:bg-white focus:border-[#0071E3]/30 focus:ring-4 focus:ring-[#0071E3]/10 transition-all duration-300 w-full placeholder:text-gray-400'

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
    triggerHaptic(5)
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
    triggerHaptic(status === 'confirmed' ? 20 : 10)
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
    <div className="bg-white rounded-3xl apple-shadow border border-black/[0.04] p-8 mt-6 space-y-4 animate-fade-in">
      <div className="flex items-center gap-4 mb-4">
        <Skeleton className="w-32 h-8" />
        <Skeleton className="w-24 h-6" />
      </div>
      <Skeleton className="w-full h-12 rounded-xl" />
      <div className="space-y-3">
        <Skeleton className="w-full h-24 rounded-2xl" />
        <Skeleton className="w-full h-24 rounded-2xl" />
      </div>
    </div>
  )

  return (
    <div className="bg-white rounded-3xl apple-shadow border border-black/[0.04] p-5 md:p-8 mt-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4 border-b border-black/[0.04] pb-5">
        <div className="flex items-center flex-wrap gap-3">
          <h3 className="text-xl sf-display-heavy text-[#1D1D1F]">Resep Obat</h3>
          {prescription?.prescription_number && (
            <span className="text-xs font-mono font-bold text-[#0071E3] bg-[#0071E3]/10 px-2.5 py-1 rounded-lg">
              {prescription.prescription_number}
            </span>
          )}
          {prescription?.status && (
            <span className={`text-[10px] px-3 py-1.5 rounded-full font-bold uppercase tracking-wider ${
              isDispensed ? 'bg-[#34C759]/10 text-[#34C759]' :
              isConfirmed ? 'bg-[#0071E3]/10 text-[#0071E3]' :
              'bg-[#FF9500]/10 text-[#FF9500]'
            }`}>
              {isDispensed ? 'Telah Diambil' : isConfirmed ? 'Dikonfirmasi' : 'Draft'}
            </span>
          )}
        </div>
        <div className="flex gap-3">
          {(isConfirmed || isDispensed) && prescription?.id && (
            <a href={`/api/doctor/prescriptions/${prescription.id}/pdf`} target="_blank"
              className="flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] bg-[#F5F5F7] text-[#1D1D1F] rounded-xl text-xs font-bold sf-display hover:bg-[#E8E8ED] transition-colors active:scale-95">
              <Download size={14} /> Unduh PDF
            </a>
          )}
          {savedMsg && (
            <span className="flex items-center gap-1.5 text-xs font-bold text-[#34C759] bg-[#34C759]/10 px-4 py-2 rounded-xl animate-scale-pop">
              <Check size={14} /> {savedMsg}
            </span>
          )}
        </div>
      </div>

      {/* Medicine search */}
      {!isReadonly && (
        <div className="mb-6 relative group">
          <div className="relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#0071E3] transition-colors" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Cari nama obat untuk ditambahkan (Contoh: Paracetamol)..."
              className="w-full pl-11 pr-4 py-3 min-h-[48px] bg-[#F5F5F7] border border-transparent rounded-xl text-sm sf-display focus:outline-none focus:bg-white focus:border-[#0071E3]/30 focus:ring-4 focus:ring-[#0071E3]/10 transition-all duration-300" />
            {searching && <Loader2 size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#0071E3] animate-spin" />}
          </div>
          {results.length > 0 && (
            <div className="absolute top-[calc(100%+8px)] left-0 right-0 z-20 bg-white/95 backdrop-blur-xl border border-black/[0.08] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden animate-fade-in-up">
              <div className="max-h-[300px] overflow-y-auto overscroll-contain">
                {results.map(med => (
                  <button key={med.id} type="button" onClick={() => addItem(med)}
                    className="w-full flex items-center justify-between px-5 py-4 text-sm hover:bg-[#F5F5F7] transition-colors border-b border-black/[0.04] last:border-0 group/item">
                    <div className="text-left flex-1 min-w-0 pr-4">
                      <p className="font-bold text-[#1D1D1F] sf-display truncate group-hover/item:text-[#0071E3] transition-colors">{med.name}</p>
                      {med.generic_name && <p className="text-xs text-[#86868B] truncate mt-0.5">{med.generic_name}</p>}
                    </div>
                    <div className="text-right flex-shrink-0 ml-auto">
                      <p className={`text-xs font-bold ${med.stock <= 0 ? 'text-[#FF3B30]' : med.stock <= 5 ? 'text-[#FF9500]' : 'text-[#34C759]'}`}>
                        Sisa: {med.stock} {med.unit}
                      </p>
                      <p className="text-[11px] text-[#86868B] sf-display mt-0.5">{fmtRupiah(med.price)}</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-[#F5F5F7] group-hover/item:bg-[#0071E3] flex items-center justify-center ml-4 transition-colors shrink-0">
                       <Plus size={14} className="text-[#0071E3] group-hover/item:text-white transition-colors" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Items list */}
      {items.length === 0 ? (
        <div className="text-center py-12 px-4 bg-[#F5F5F7] border border-dashed border-black/[0.1] rounded-2xl animate-fade-in">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm mb-3">
             <Pill size={20} className="text-gray-400" />
          </div>
          <p className="text-sm font-medium text-[#1D1D1F] sf-display">Belum ada obat</p>
          <p className="text-xs text-[#86868B] mt-1">
            {isReadonly ? 'Resep kosong.' : 'Silakan cari obat pada kolom pencarian di atas.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4 mb-6">
          {items.map((item, idx) => (
            <div key={idx} className={`rounded-2xl border transition-all duration-300 animate-fade-up ${item.quantity > item.medicine_stock ? 'border-[#FF3B30]/30 bg-[#FF3B30]/5' : 'border-black/[0.04] bg-white apple-shadow hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)]'}`} style={{animationDelay: `${idx * 0.05}s`}}>
              {/* Card Header */}
              <div className="flex items-start justify-between p-4 border-b border-black/[0.04] bg-[#F5F5F7]/50 rounded-t-2xl">
                <div className="flex-1 min-w-0 pr-4">
                  <p className="font-bold text-[#1D1D1F] sf-display text-base leading-tight mb-1">{item.medicine_name}</p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <p className="text-[11px] text-[#86868B] sf-display font-medium bg-white px-2 py-0.5 rounded-md border border-black/[0.05]">
                      Stok: {item.medicine_stock} {item.medicine_unit}
                    </p>
                    <p className="text-[11px] text-[#86868B] sf-display font-medium bg-white px-2 py-0.5 rounded-md border border-black/[0.05]">
                      {fmtRupiah(item.medicine_price)}/unit
                    </p>
                    {item.quantity > item.medicine_stock && (
                      <span className="text-[#FF3B30] text-[10px] font-bold uppercase tracking-wider bg-white px-2 py-0.5 rounded-md border border-[#FF3B30]/20 flex items-center gap-1">
                        <AlertTriangle size={10} /> Stok tidak cukup
                      </span>
                    )}
                  </div>
                </div>
                {!isReadonly && (
                  <button type="button" onClick={() => { triggerHaptic(10); setItems(prev => prev.filter((_, i) => i !== idx)) }}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-[#FF3B30] hover:bg-[#FF3B30]/10 transition-colors shrink-0">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
              
              {/* Card Form Body */}
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-[#86868B] uppercase tracking-[0.1em] mb-1.5 block">Jumlah (Qty)</label>
                  <input type="number" min={1} value={item.quantity} disabled={isReadonly}
                    onChange={e => updateItem(idx, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                    className={`${INPUT} ${isReadonly ? 'opacity-70 bg-transparent px-0 border-0 shadow-none ring-0' : ''}`} />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#86868B] uppercase tracking-[0.1em] mb-1.5 block">Aturan Pakai</label>
                  {isReadonly
                    ? <p className="text-sm font-medium sf-display text-[#1D1D1F] py-3">{item.dosage}</p>
                    : <select value={item.dosage} onChange={e => updateItem(idx, 'dosage', e.target.value)} className={INPUT}>
                        {DOSAGE_OPTS.map(d => <option key={d} value={d}>{d}</option>)}
                        {!DOSAGE_OPTS.includes(item.dosage) && <option value={item.dosage}>{item.dosage}</option>}
                      </select>
                  }
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#86868B] uppercase tracking-[0.1em] mb-1.5 block">Durasi (Hari)</label>
                  {isReadonly
                    ? <p className="text-sm font-medium sf-display text-[#1D1D1F] py-3">{item.duration || '—'}</p>
                    : <select value={item.duration} onChange={e => updateItem(idx, 'duration', e.target.value)} className={INPUT}>
                        {DURATION_OPTS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                  }
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#86868B] uppercase tracking-[0.1em] mb-1.5 block">Catatan Opsional</label>
                  {isReadonly
                    ? <p className="text-sm font-medium sf-display text-[#1D1D1F] py-3">{item.notes || '—'}</p>
                    : <input value={item.notes} disabled={isReadonly}
                        onChange={e => updateItem(idx, 'notes', e.target.value)}
                        placeholder="Cth: Sesudah makan..." className={INPUT} />
                  }
                </div>
              </div>
            </div>
          ))}

          {/* Subtotal Footer */}
          {totalPrice > 0 && (
            <div className="flex justify-end pt-2 animate-fade-in">
              <div className="bg-[#F5F5F7] px-4 py-2.5 rounded-xl flex items-center gap-3">
                 <span className="text-xs text-[#86868B] font-medium uppercase tracking-wider">Estimasi Total:</span>
                 <span className="text-lg font-black sf-display text-[#1D1D1F]">{fmtRupiah(totalPrice)}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Doctor General Notes */}
      {!isReadonly && (
        <div className="mb-8">
          <label className="text-[10px] font-bold text-[#86868B] uppercase tracking-[0.1em] block mb-2">Catatan Umum Dokter (Untuk Apoteker/Pasien)</label>
          <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Instruksi tambahan..."
            className="w-full px-4 py-3 bg-[#F5F5F7] border border-transparent rounded-xl text-sm sf-display text-[#1D1D1F] focus:outline-none focus:bg-white focus:border-[#0071E3]/30 focus:ring-4 focus:ring-[#0071E3]/10 transition-all duration-300 resize-none placeholder:text-gray-400" />
        </div>
      )}
      
      {isReadonly && prescription?.notes && (
        <div className="mb-6 bg-[#F5F5F7] rounded-2xl p-4 border border-black/[0.04]">
          <p className="text-[10px] font-bold text-[#86868B] uppercase tracking-[0.1em] mb-2">Catatan Dokter</p>
          <p className="text-sm text-[#1D1D1F] sf-display leading-relaxed whitespace-pre-wrap">{prescription.notes}</p>
        </div>
      )}

      {/* Warnings */}
      {hasStockWarn && (
        <div className="flex items-center gap-3 bg-[#FF3B30]/10 border border-[#FF3B30]/20 rounded-xl p-4 mb-6 text-sm text-[#FF3B30] font-medium animate-fade-in">
          <AlertTriangle size={18} className="shrink-0" />
          <span>Terdapat obat yang melebihi batas stok. Silakan kurangi kuantitas sebelum finalisasi.</span>
        </div>
      )}

      {/* Actions */}
      {!isReadonly && (
        <div className="flex flex-col sm:flex-row gap-3 mt-4 pt-6 border-t border-black/[0.04]">
          <button type="button" onClick={() => handleSave('draft')} disabled={saving || items.length === 0}
            className="flex-1 min-h-[48px] px-6 py-3 bg-[#F5F5F7] text-[#1D1D1F] rounded-xl font-bold text-sm sf-display hover:bg-[#E8E8ED] transition-colors disabled:opacity-50 active:scale-[0.98]">
            {saving ? <><Loader2 size={16} className="inline animate-spin mr-2" />Menyimpan...</> : 'Simpan sebagai Draft'}
          </button>
          <button type="button" onClick={() => handleSave('confirmed')} disabled={confirming || items.length === 0 || hasStockWarn}
            className="flex-1 min-h-[48px] px-6 py-3 bg-[#0071E3] text-white rounded-xl font-bold text-sm sf-display hover:bg-[#005BB5] shadow-[0_8px_20px_rgba(0,113,227,0.24)] transition-all hover:shadow-[0_12px_25px_rgba(0,113,227,0.32)] disabled:opacity-50 disabled:shadow-none active:scale-[0.98]">
            {confirming ? <><Loader2 size={16} className="inline animate-spin mr-2" />Memproses...</> : 'Finalisasi & Terbitkan Resep'}
          </button>
        </div>
      )}
    </div>
  )
}
