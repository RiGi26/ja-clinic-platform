'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { DollarSign, Check, ChevronDown, Download, Send, Plus, X, BookOpen, Pencil } from 'lucide-react'
import TreatmentPicker, { type Treatment } from '@/components/TreatmentPicker'

function fmtRupiah(n: number) {
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1).replace('.0', '')}jt`
  if (n >= 1_000)     return `Rp ${(n / 1_000).toFixed(0)}rb`
  return `Rp ${n.toLocaleString('id-ID')}`
}
function fmtRupiahFull(n: number) { return 'Rp ' + n.toLocaleString('id-ID') }

const PAY_METHODS = [
  { value: 'cash',      label: 'Tunai' },
  { value: 'transfer',  label: 'Transfer Bank' },
  { value: 'bpjs',      label: 'BPJS' },
  { value: 'insurance', label: 'Asuransi' },
]

const AVATAR_COLORS = [
  'from-cyan-400 to-blue-500',
  'from-violet-400 to-purple-600',
  'from-emerald-400 to-teal-600',
  'from-orange-400 to-red-500',
]
function avatarColor(name: string) {
  return AVATAR_COLORS[(name ?? '').split('').reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length]
}

type Bill = {
  id: string; invoice_number: string; total: number; status: string
  payment_method: string | null; created_at: string
  patients: { full_name: string; no_rm: string } | null
}

type BillItem = { id: string; name: string; qty: number; price: number; subtotal: number; isManual?: boolean }

function emptyManualItem(): BillItem {
  return { id: crypto.randomUUID(), name: '', qty: 1, price: 0, subtotal: 0, isManual: true }
}

export default function BillingClient({ initial, summary }: {
  initial: Bill[]
  summary: {
    totalPending: number; totalPaid: number
    countPending: number; countPaid: number; total: number
  }
}) {
  const router = useRouter()
  const [bills, setBills]           = useState<Bill[]>(initial)
  const [payModal, setPayModal]     = useState<string | null>(null)
  const [payMethod, setPayMethod]   = useState('cash')
  const [pending, startTransition]  = useTransition()

  // PDF / WA
  const [pdfLoading, setPdfLoading] = useState<string | null>(null)
  const [waLoading, setWaLoading]   = useState<string | null>(null)
  const [waResult, setWaResult]     = useState<{ id: string; ok: boolean; msg: string } | null>(null)

  // Create billing modal
  const [showCreate, setShowCreate]     = useState(false)
  const [patientId, setPatientId]       = useState('')
  const [appointmentId, setAppointmentId] = useState('')
  const [billItems, setBillItems]       = useState<BillItem[]>([emptyManualItem()])
  const [discount, setDiscount]         = useState(0)
  const [billNotes, setBillNotes]       = useState('')
  const [itemMode, setItemMode]         = useState<'catalog' | 'manual'>('catalog')
  const [createPending, setCreatePending] = useState(false)
  const [createError, setCreateError]   = useState('')

  const SUMMARY = [
    { label: 'Belum Bayar',     value: fmtRupiah(summary.totalPending), count: summary.countPending },
    { label: 'Lunas Bulan Ini', value: fmtRupiah(summary.totalPaid),    count: summary.countPaid    },
    { label: 'Total Invoice',   value: fmtRupiah(summary.totalPending + summary.totalPaid), count: summary.total },
  ]

  function handleMarkPaid(id: string) {
    startTransition(async () => {
      const res = await fetch(`/api/admin/billing/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_method: payMethod }),
      })
      if (res.ok) {
        setBills(prev => prev.map(b => b.id === id ? { ...b, status: 'paid', payment_method: payMethod } : b))
        setPayModal(null)
      }
    })
  }

  async function handleDownloadPdf(bill: Bill) {
    setPdfLoading(bill.id)
    try {
      const res = await fetch(`/api/admin/billing/${bill.id}/pdf`)
      if (!res.ok) { alert('Gagal generate PDF'); return }
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url; a.download = `${bill.invoice_number}.pdf`; a.click()
      URL.revokeObjectURL(url)
    } finally { setPdfLoading(null) }
  }

  async function handleSendWA(bill: Bill) {
    setWaLoading(bill.id); setWaResult(null)
    try {
      const res  = await fetch('/api/admin/notifications/send', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'invoice', billingId: bill.id }),
      })
      const data = await res.json() as { success?: boolean; error?: string }
      setWaResult({ id: bill.id, ok: data.success ?? false, msg: data.success ? 'WA terkirim!' : (data.error ?? 'Gagal') })
    } finally { setWaLoading(null) }
  }

  // Create billing helpers
  function addFromCatalog(t: Treatment) {
    setBillItems(items => {
      const existing = items.find(i => i.id === t.id && !i.isManual)
      if (existing) {
        return items.map(i => i.id === t.id && !i.isManual
          ? { ...i, qty: i.qty + 1, subtotal: (i.qty + 1) * i.price }
          : i
        )
      }
      return [...items, { id: t.id, name: t.name, qty: 1, price: t.price, subtotal: t.price }]
    })
  }

  function addManualRow() { setBillItems(items => [...items, emptyManualItem()]) }

  function updateItem(idx: number, field: keyof BillItem, val: string | number) {
    setBillItems(items => items.map((item, i) => {
      if (i !== idx) return item
      const updated = { ...item, [field]: val }
      if (field === 'qty' || field === 'price') {
        updated.subtotal = Number(updated.qty) * Number(updated.price)
      }
      return updated
    }))
  }

  function removeItem(idx: number) { setBillItems(items => items.filter((_, i) => i !== idx)) }

  const subtotal = billItems.reduce((s, i) => s + i.subtotal, 0)
  const total    = subtotal - discount

  function resetCreateForm() {
    setPatientId(''); setAppointmentId(''); setBillItems([emptyManualItem()])
    setDiscount(0); setBillNotes(''); setCreateError('')
  }

  async function handleCreateBilling() {
    if (!patientId.trim()) { setCreateError('Patient ID wajib diisi'); return }
    const validItems = billItems.filter(i => i.name.trim() && i.qty > 0 && i.price >= 0)
    if (validItems.length === 0) { setCreateError('Minimal 1 item tagihan yang valid'); return }

    setCreatePending(true); setCreateError('')
    try {
      const res = await fetch('/api/admin/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id:     patientId.trim(),
          appointment_id: appointmentId.trim() || undefined,
          items:          validItems.map(i => ({ name: i.name, qty: i.qty, price: i.price, subtotal: i.subtotal })),
          discount,
          notes:          billNotes || undefined,
        }),
      })
      const data = await res.json() as { success?: boolean; error?: string; bill?: { invoice_number: string } }
      if (res.ok) {
        setShowCreate(false)
        resetCreateForm()
        router.refresh()
      } else {
        setCreateError(data.error ?? 'Gagal membuat tagihan')
      }
    } finally { setCreatePending(false) }
  }

  return (
    <>
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-5 mb-7">
        {SUMMARY.map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                <DollarSign size={20} className="text-primary" />
              </div>
              <span className="text-xs font-bold text-muted-foreground">{s.count} invoice</span>
            </div>
            <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-1">{s.label}</p>
            <p className="text-2xl font-black text-secondary tabular-nums">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Buat tagihan button */}
      <div className="flex justify-end mb-5">
        <button onClick={() => { resetCreateForm(); setShowCreate(true) }}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary-hover transition-colors shadow-sm">
          <Plus size={15} /> Buat Tagihan
        </button>
      </div>

      {/* Bills list */}
      {bills.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center shadow-sm">
          <p className="text-muted-foreground font-semibold text-sm">Belum ada data billing</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bills.map(b => {
            const patientName  = b.patients?.full_name ?? 'Pasien'
            const noRM         = b.patients?.no_rm ?? '—'
            const date         = new Date(b.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
            const isPending    = b.status === 'pending'
            const isPaid       = b.status === 'paid'
            const isPdfLoading = pdfLoading === b.id
            const isWaLoading  = waLoading === b.id

            return (
              <div key={b.id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-5">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${avatarColor(patientName)} flex items-center justify-center text-white font-black text-base flex-shrink-0`}>
                    {patientName.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()}
                  </div>
                  <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 items-center">
                    <div>
                      <p className="font-black text-secondary text-sm">{patientName}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{noRM}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-0.5">Invoice</p>
                      <p className="text-sm font-bold text-secondary font-mono">{b.invoice_number}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-0.5">Tanggal</p>
                      <p className="text-sm font-bold text-secondary">{date}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-0.5">Total</p>
                      <p className="text-base font-black text-secondary tabular-nums">{fmtRupiah(b.total ?? 0)}</p>
                      {b.payment_method && <p className="text-[10px] text-muted-foreground capitalize">{b.payment_method}</p>}
                    </div>
                    <div className="flex items-center gap-2 justify-end flex-wrap">
                      <span className={`px-3 py-1.5 rounded-full font-bold text-xs ${isPaid ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                        {isPaid ? 'Lunas' : 'Pending'}
                      </span>
                      <button onClick={() => handleDownloadPdf(b)} disabled={isPdfLoading} title="Download PDF"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/10 transition-colors disabled:opacity-50">
                        <Download size={15} className={isPdfLoading ? 'animate-pulse' : ''} />
                      </button>
                      {isPaid && (
                        <button onClick={() => handleSendWA(b)} disabled={isWaLoading} title="Kirim WA Invoice"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors disabled:opacity-50">
                          <Send size={15} className={isWaLoading ? 'animate-pulse' : ''} />
                        </button>
                      )}
                      {isPending && (
                        <button onClick={() => { setPayModal(b.id); setPayMethod('cash') }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary-hover transition-colors">
                          <Check size={12} /> Bayar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                {waResult?.id === b.id && (
                  <p className={`text-xs mt-2 font-medium ${waResult.ok ? 'text-green-600' : 'text-red-600'}`}>
                    {waResult.ok ? '✅' : '❌'} {waResult.msg}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Pay Modal */}
      {payModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setPayModal(null)}>
          <div className="bg-white rounded-2xl p-7 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-black text-secondary mb-5">Konfirmasi Pembayaran</h3>
            <div className="mb-5">
              <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground block mb-2">Metode Pembayaran</label>
              <div className="relative">
                <select value={payMethod} onChange={e => setPayMethod(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary appearance-none">
                  {PAY_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
                <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setPayModal(null)}
                className="flex-1 py-3 bg-gray-100 text-secondary rounded-xl font-bold text-sm hover:bg-gray-200 transition-colors">Batal</button>
              <button onClick={() => handleMarkPaid(payModal)} disabled={pending}
                className="flex-1 py-3 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary-hover transition-colors disabled:opacity-50">
                {pending ? 'Memproses...' : 'Tandai Lunas'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Billing Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center p-4 overflow-y-auto" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl my-8" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-7 py-5 border-b border-gray-100">
              <h3 className="text-lg font-black text-secondary">Buat Tagihan Baru</h3>
              <button onClick={() => setShowCreate(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                <X size={16} className="text-secondary" />
              </button>
            </div>

            <div className="px-7 py-6 space-y-5">
              {/* Patient & Appointment */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground block mb-2">Patient ID *</label>
                  <input value={patientId} onChange={e => setPatientId(e.target.value)}
                    placeholder="UUID pasien" className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all" />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground block mb-2">Appointment ID (opsional)</label>
                  <input value={appointmentId} onChange={e => setAppointmentId(e.target.value)}
                    placeholder="UUID appointment" className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all" />
                </div>
              </div>

              {/* Item mode tabs */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Item Tagihan</p>
                  <div className="flex rounded-xl border border-gray-200 overflow-hidden">
                    <button onClick={() => setItemMode('catalog')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold transition-all ${itemMode === 'catalog' ? 'bg-primary text-white' : 'text-secondary hover:bg-gray-50'}`}>
                      <BookOpen size={12} /> Katalog
                    </button>
                    <button onClick={() => setItemMode('manual')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold transition-all ${itemMode === 'manual' ? 'bg-primary text-white' : 'text-secondary hover:bg-gray-50'}`}>
                      <Pencil size={12} /> Manual
                    </button>
                  </div>
                </div>

                {/* MODE A — Katalog */}
                {itemMode === 'catalog' && (
                  <div className="mb-3">
                    <TreatmentPicker onSelect={addFromCatalog} placeholder="Cari & pilih tindakan dari katalog..." />
                    <p className="text-xs text-muted-foreground mt-1.5">Klik tindakan untuk menambahkan ke tagihan. Klik lagi untuk menambah qty.</p>
                  </div>
                )}

                {/* MODE B — Manual */}
                {itemMode === 'manual' && (
                  <div className="mb-3">
                    <button onClick={addManualRow}
                      className="flex items-center gap-1.5 px-3 py-2 bg-primary/10 text-primary rounded-xl hover:bg-primary/20 transition-colors text-xs font-bold">
                      <Plus size={12} /> Tambah Baris
                    </button>
                  </div>
                )}

                {/* Items list (shared) */}
                {billItems.length > 0 && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-12 gap-2 px-1">
                      <p className="col-span-5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Nama</p>
                      <p className="col-span-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-center">Qty</p>
                      <p className="col-span-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-right">Harga</p>
                      <p className="col-span-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-right">Sub</p>
                    </div>
                    {billItems.map((item, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                        <input value={item.name} readOnly={!item.isManual}
                          onChange={e => updateItem(idx, 'name', e.target.value)}
                          className={`col-span-5 px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary ${!item.isManual ? 'bg-gray-50 text-secondary' : ''}`} />
                        <input type="number" min={1} value={item.qty}
                          onChange={e => updateItem(idx, 'qty', parseInt(e.target.value) || 1)}
                          className="col-span-2 px-3 py-2 border border-gray-200 rounded-lg text-xs text-center focus:outline-none focus:ring-1 focus:ring-primary" />
                        <input type="number" min={0} value={item.price} readOnly={!item.isManual}
                          onChange={e => updateItem(idx, 'price', parseInt(e.target.value) || 0)}
                          className={`col-span-3 px-3 py-2 border border-gray-200 rounded-lg text-xs text-right focus:outline-none focus:ring-1 focus:ring-primary ${!item.isManual ? 'bg-gray-50' : ''}`} />
                        <div className="col-span-2 flex items-center justify-end gap-1">
                          <span className="text-xs font-bold text-secondary">{fmtRupiah(item.subtotal)}</span>
                          <button onClick={() => removeItem(idx)} className="p-1 text-gray-300 hover:text-destructive transition-colors">
                            <X size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Totals */}
              <div className="border-t border-gray-100 pt-4 space-y-2">
                <div className="flex items-center gap-3">
                  <label className="text-xs font-bold text-muted-foreground w-24">Diskon (Rp)</label>
                  <input type="number" min={0} value={discount} onChange={e => setDiscount(parseInt(e.target.value) || 0)}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-xs font-bold text-muted-foreground w-24">Catatan</label>
                  <input value={billNotes} onChange={e => setBillNotes(e.target.value)}
                    placeholder="Catatan billing (opsional)" className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                  <span className="text-xs text-muted-foreground">Subtotal: {fmtRupiahFull(subtotal)}</span>
                  <span className="text-base font-black text-secondary">Total: {fmtRupiahFull(total)}</span>
                </div>
              </div>

              {createError && <p className="text-sm text-destructive font-medium">{createError}</p>}
            </div>

            <div className="flex gap-3 px-7 pb-7">
              <button onClick={() => setShowCreate(false)}
                className="flex-1 py-3 bg-gray-100 text-secondary rounded-xl font-bold text-sm hover:bg-gray-200 transition-colors">Batal</button>
              <button onClick={handleCreateBilling} disabled={createPending}
                className="flex-1 py-3 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary-hover transition-colors disabled:opacity-50">
                {createPending ? 'Menyimpan...' : 'Buat Tagihan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
