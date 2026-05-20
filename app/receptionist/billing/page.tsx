'use client'

import { useState, useEffect, useCallback } from 'react'
import { Receipt, X, Download } from 'lucide-react'

type CompletedApt = {
  id: string; scheduled_at: string
  patients: { id: string; full_name: string; no_rm: string; phone: string | null } | null
  doctors:  { full_name: string; consultation_fee?: number } | null
}
type BillRecord    = { id: string; invoice_number: string; total: number; status: string; appointment_id: string | null }
type PrescriptionInfo = { id: string; status: string; total_price: number } | null

const INPUT = 'w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all'
const LABEL = 'text-[10px] uppercase tracking-widest font-bold text-muted-foreground block mb-2'

const PAY_METHODS = [
  { value: 'cash',      label: '💵 Tunai' },
  { value: 'transfer',  label: '🏦 Transfer' },
  { value: 'bpjs',      label: '🏥 BPJS' },
  { value: 'insurance', label: '📋 Asuransi' },
]

function fmtRupiah(n: number) { return 'Rp ' + n.toLocaleString('id-ID') }
function fmtTime(iso: string) {
  return new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
}

export default function ReceptionistBillingPage() {
  const [appointments, setAppointments] = useState<CompletedApt[]>([])
  const [bills,        setBills]        = useState<BillRecord[]>([])
  const [loading,      setLoading]      = useState(true)
  const [toast,        setToast]        = useState<string | null>(null)

  const [billingModal, setBillingModal] = useState<CompletedApt | null>(null)
  const [presInfo,     setPresInfo]     = useState<PrescriptionInfo>(null)
  const [loadingPres,  setLoadingPres]  = useState(false)
  const [payMethod,    setPayMethod]    = useState('cash')
  const [amount,       setAmount]       = useState('')
  const [discount,     setDiscount]     = useState('')
  const [notes,        setNotes]        = useState('')
  const [submitting,   setSubmitting]   = useState(false)

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 4000) }

  const load = useCallback(async () => {
    setLoading(true)
    const now   = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    const end   = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString()

    const [aptsRes, billsRes] = await Promise.all([
      fetch(`/api/admin/appointments?date=${now.toISOString().split('T')[0]}`).then(r => r.json()),
      fetch(`/api/admin/billing?from=${start}&to=${end}`).then(r => r.json()).catch(() => ({ bills: [] })),
    ])

    const all      = (aptsRes.appointments ?? []) as CompletedApt[]
    const completed = all.filter((a: any) => a.status === 'selesai')
    setAppointments(completed)
    setBills(billsRes.bills ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const billedIds = new Set(bills.map(b => b.appointment_id))

  async function openBilling(apt: CompletedApt) {
    const fee = (apt.doctors as any)?.consultation_fee ?? 0
    setAmount(String(fee)); setDiscount(''); setNotes(''); setPayMethod('cash')
    setBillingModal(apt); setPresInfo(null)
    setLoadingPres(true)
    try {
      const res = await fetch(`/api/receptionist/prescription-for-apt?appointment_id=${apt.id}`)
      const d   = await res.json() as { prescription?: any }
      if (d.prescription) {
        const total = (d.prescription.prescription_items ?? []).reduce((sum: number, item: any) =>
          sum + item.quantity * (item.medicines?.price ?? 0), 0)
        setPresInfo({ id: d.prescription.id, status: d.prescription.status, total_price: total })
        if (d.prescription.status === 'dispensed' && total > 0) {
          setAmount(String(fee + total))
        }
      }
    } catch { /* ignore */ }
    setLoadingPres(false)
  }

  async function handleCreateBilling() {
    if (!billingModal) return
    const total = parseInt(amount) - (parseInt(discount) || 0)
    if (total < 0) { showToast('Total tidak boleh negatif'); return }

    setSubmitting(true)
    const res = await fetch('/api/admin/billing', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patient_id:     (billingModal.patients as any)?.id,
        appointment_id: billingModal.id,
        items: [{ name: 'Konsultasi', qty: 1, price: parseInt(amount) || 0, subtotal: parseInt(amount) || 0 }],
        discount: parseInt(discount) || 0,
        payment_method: payMethod,
        status: 'paid',
        notes,
      }),
    })
    const data = await res.json() as { success?: boolean; bill?: { id: string; invoice_number: string }; error?: string }
    if (res.ok && data.bill) {
      showToast(`Invoice ${data.bill.invoice_number} berhasil dibuat`)
      setBillingModal(null)
      load()
      window.open(`/api/admin/billing/${data.bill.id}/pdf`, '_blank')
    } else {
      showToast(data.error ?? 'Gagal membuat billing')
    }
    setSubmitting(false)
  }

  const unbilled = appointments.filter(a => !billedIds.has(a.id))
  const billed   = appointments.filter(a => billedIds.has(a.id))

  return (
    <div>
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-gray-900 text-white px-5 py-3 rounded-2xl shadow-xl font-bold text-sm">{toast}</div>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-black text-secondary">Billing</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Proses pembayaran untuk pasien yang sudah selesai diperiksa</p>
      </div>

      {loading ? (
        <div className="py-16 text-center text-muted-foreground text-sm">Memuat...</div>
      ) : (
        <div className="space-y-6">
          {/* Belum dibilling */}
          <div>
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">
              Perlu Dibilling ({unbilled.length})
            </h2>
            {unbilled.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center border border-gray-100 text-sm text-muted-foreground">
                Tidak ada pasien yang perlu dibilling
              </div>
            ) : (
              <div className="space-y-3">
                {unbilled.map(a => (
                  <div key={a.id} className="bg-white rounded-2xl p-5 border border-amber-100 shadow-sm flex items-center gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-secondary">{(a.patients as any)?.full_name}</p>
                      <p className="text-xs text-muted-foreground">{(a.patients as any)?.no_rm}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {fmtTime(a.scheduled_at)} · dr. {(a.doctors as any)?.full_name}
                      </p>
                    </div>
                    <button onClick={() => openBilling(a)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary-hover transition-colors whitespace-nowrap">
                      <Receipt size={14} /> Proses Billing
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sudah dibilling */}
          {billed.length > 0 && (
            <div>
              <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">
                Sudah Dibilling ({billed.length})
              </h2>
              <div className="space-y-2">
                {billed.map(a => {
                  const bill = bills.find(b => b.appointment_id === a.id)
                  return (
                    <div key={a.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center gap-4 opacity-70">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-700 text-sm">{(a.patients as any)?.full_name}</p>
                        <p className="text-xs text-gray-400">{bill?.invoice_number} · {fmtRupiah(bill?.total ?? 0)}</p>
                      </div>
                      <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">Lunas</span>
                      {bill && (
                        <a href={`/api/admin/billing/${bill.id}/pdf`} target="_blank"
                          className="p-2 text-gray-400 hover:text-primary transition-colors">
                          <Download size={14} />
                        </a>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Billing Modal */}
      {billingModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setBillingModal(null)}>
          <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md shadow-2xl overflow-y-auto max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-7 py-5 border-b border-gray-100">
              <div>
                <h3 className="font-black text-gray-900 text-lg">Proses Billing</h3>
                <p className="text-xs text-gray-400">{(billingModal.patients as any)?.full_name}</p>
              </div>
              <button onClick={() => setBillingModal(null)}><X size={18} className="text-gray-400" /></button>
            </div>
            <div className="p-7 space-y-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 mb-0.5">Pasien</p>
                    <p className="font-bold text-gray-800">{(billingModal.patients as any)?.full_name}</p>
                    <p className="text-xs text-gray-400">{(billingModal.patients as any)?.no_rm}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 mb-0.5">Dokter</p>
                    <p className="font-bold text-gray-800">dr. {(billingModal.doctors as any)?.full_name}</p>
                    <p className="text-xs text-gray-400">{fmtTime(billingModal.scheduled_at)}</p>
                  </div>
                </div>
              </div>

              <div>
                <label className={LABEL}>Metode Pembayaran</label>
                <div className="grid grid-cols-2 gap-2">
                  {PAY_METHODS.map(m => (
                    <button key={m.value} type="button" onClick={() => setPayMethod(m.value)}
                      className={`py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${payMethod === m.value ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 text-gray-600'}`}>
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Prescription info */}
              {!loadingPres && presInfo && (
                <div className={`rounded-xl p-3 text-sm ${presInfo.status === 'dispensed' ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200'}`}>
                  {presInfo.status === 'dispensed'
                    ? <p className="text-emerald-700 font-bold">✅ Obat: {fmtRupiah(presInfo.total_price)} (sudah dikeluarkan, auto-included)</p>
                    : <p className="text-amber-700 font-bold">⚠️ Resep belum dikeluarkan — harga obat belum dihitung</p>
                  }
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={LABEL}>Total (Rp)</label>
                  <input type="number" value={amount} onChange={e => setAmount(e.target.value)} min={0} className={INPUT} />
                </div>
                <div>
                  <label className={LABEL}>Diskon (Rp)</label>
                  <input type="number" value={discount} onChange={e => setDiscount(e.target.value)} min={0} placeholder="0" className={INPUT} />
                </div>
              </div>

              {(parseInt(amount) > 0) && (
                <div className="bg-emerald-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-emerald-600 font-bold">Grand Total</p>
                  <p className="text-2xl font-black text-emerald-700">
                    {fmtRupiah(Math.max(0, parseInt(amount) - (parseInt(discount) || 0)))}
                  </p>
                </div>
              )}

              <div>
                <label className={LABEL}>Catatan</label>
                <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Opsional..." className={INPUT} />
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setBillingModal(null)} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm">Batal</button>
                <button onClick={handleCreateBilling} disabled={submitting || !amount}
                  className="flex-1 py-3 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {submitting ? 'Memproses...' : <><Receipt size={14} /> Konfirmasi & Invoice</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
