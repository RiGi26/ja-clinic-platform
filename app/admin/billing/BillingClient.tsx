'use client'

import { useState, useTransition } from 'react'
import { DollarSign, Check, ChevronDown, Download, Send } from 'lucide-react'

function fmtRupiah(n: number) {
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1).replace('.0', '')}jt`
  if (n >= 1_000)     return `Rp ${(n / 1_000).toFixed(0)}rb`
  return `Rp ${n.toLocaleString('id-ID')}`
}

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
  id: string
  invoice_number: string
  total: number
  status: string
  payment_method: string | null
  created_at: string
  patients: { full_name: string; no_rm: string } | null
}

export default function BillingClient({ initial, summary }: {
  initial: Bill[]
  summary: {
    totalPending: number; totalPaid: number
    countPending: number; countPaid: number; total: number
  }
}) {
  const [bills, setBills]         = useState<Bill[]>(initial)
  const [payModal, setPayModal]   = useState<string | null>(null)
  const [payMethod, setPayMethod] = useState('cash')
  const [pending, startTransition] = useTransition()

  const [pdfLoading, setPdfLoading] = useState<string | null>(null)
  const [waLoading, setWaLoading]   = useState<string | null>(null)
  const [waResult, setWaResult]     = useState<{ id: string; ok: boolean; msg: string } | null>(null)

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
      a.href     = url
      a.download = `${bill.invoice_number}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setPdfLoading(null)
    }
  }

  async function handleSendWA(bill: Bill) {
    setWaLoading(bill.id)
    setWaResult(null)
    try {
      const res  = await fetch('/api/admin/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'invoice', billingId: bill.id }),
      })
      const data = await res.json() as { success?: boolean; error?: string }
      setWaResult({
        id:  bill.id,
        ok:  data.success ?? false,
        msg: data.success ? 'WA terkirim!' : (data.error ?? 'Gagal'),
      })
    } finally {
      setWaLoading(null)
    }
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

      {/* Bills list */}
      {bills.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center shadow-sm">
          <p className="text-muted-foreground font-semibold text-sm">Belum ada data billing</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bills.map(b => {
            const patientName = b.patients?.full_name ?? 'Pasien'
            const noRM        = b.patients?.no_rm ?? '—'
            const date        = new Date(b.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
            const isPending   = b.status === 'pending'
            const isPaid      = b.status === 'paid'
            const isWaLoading = waLoading === b.id
            const isPdfLoading = pdfLoading === b.id

            return (
              <div key={b.id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-5">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${avatarColor(patientName)} flex items-center justify-center text-white font-black text-base flex-shrink-0`}>
                    {patientName.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()}
                  </div>

                  <div className="flex-1 grid grid-cols-5 gap-4 items-center">
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
                      {b.payment_method && (
                        <p className="text-[10px] text-muted-foreground capitalize">{b.payment_method}</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 justify-end flex-wrap">
                      <span className={`px-3 py-1.5 rounded-full font-bold text-xs ${isPaid ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                        {isPaid ? 'Lunas' : 'Pending'}
                      </span>

                      {/* Download PDF */}
                      <button
                        onClick={() => handleDownloadPdf(b)}
                        disabled={isPdfLoading}
                        title="Download PDF"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
                      >
                        <Download size={15} className={isPdfLoading ? 'animate-pulse' : ''} />
                      </button>

                      {/* Kirim WA (paid only) */}
                      {isPaid && (
                        <button
                          onClick={() => handleSendWA(b)}
                          disabled={isWaLoading}
                          title="Kirim WA Invoice"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors disabled:opacity-50"
                        >
                          <Send size={15} className={isWaLoading ? 'animate-pulse' : ''} />
                        </button>
                      )}

                      {isPending && (
                        <button
                          onClick={() => { setPayModal(b.id); setPayMethod('cash') }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary-hover transition-colors"
                        >
                          <Check size={12} /> Bayar
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* WA result toast inline */}
                {waResult?.id === b.id && (
                  <p className={`text-xs mt-2 ml-19 font-medium ${waResult.ok ? 'text-green-600' : 'text-red-600'}`}>
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
                className="flex-1 py-3 bg-gray-100 text-secondary rounded-xl font-bold text-sm hover:bg-gray-200 transition-colors">
                Batal
              </button>
              <button onClick={() => handleMarkPaid(payModal)} disabled={pending}
                className="flex-1 py-3 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary-hover transition-colors disabled:opacity-50">
                {pending ? 'Memproses...' : 'Tandai Lunas'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
