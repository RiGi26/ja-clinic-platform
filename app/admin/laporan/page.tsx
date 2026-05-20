'use client'

import { useState, useEffect } from 'react'
import TopBar from '@/components/TopBar'
import { BarChart3, Users, CheckCircle, XCircle, TrendingUp, DollarSign, Clock, Download, FileSpreadsheet, X } from 'lucide-react'

function fmtRupiah(n: number) {
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1).replace('.0', '')}jt`
  if (n >= 1_000)     return `Rp ${(n / 1_000).toFixed(0)}rb`
  return `Rp ${n.toLocaleString('id-ID')}`
}

const PAY_LABEL: Record<string, string> = { cash: 'Tunai', transfer: 'Transfer', bpjs: 'BPJS', insurance: 'Asuransi' }
const PAY_COLOR: Record<string, string> = {
  cash: 'bg-emerald-500', transfer: 'bg-blue-500', bpjs: 'bg-cyan-500', insurance: 'bg-violet-500',
}

type Data = {
  totalPasien: number; selesai: number; batal: number; menunggu: number
  walkin: number; booking: number; revenue: number; revenuePending: number
  byPayment: Record<string, number>
  byDoctor: { doctor_id: string; full_name: string; specialty: string; total: number; selesai: number; menunggu: number }[]
  byPenjamin?: Record<string, number>
}
type Notif = { id: string; type: string; status: string; created_at: string }

export default function LaporanPage() {
  const [mode, setMode] = useState<'today' | 'month'>('today')
  const [data, setData] = useState<Data | null>(null)
  const [loading, setLoading] = useState(true)

  const [prescStats,      setPrescStats]      = useState<{ confirmed: number; dispensed: number } | null>(null)
  const [showExportModal, setShowExportModal] = useState(false)
  const [exporting,       setExporting]       = useState(false)
  const [exportType,      setExportType]      = useState('all')
  const [exportPeriod,    setExportPeriod]    = useState<'today' | 'month' | 'custom'>('month')
  const [exportFrom,      setExportFrom]      = useState('')
  const [exportTo,        setExportTo]        = useState('')
  const [exportFormat,    setExportFormat]    = useState('excel')
  const [notifs,          setNotifs]          = useState<Notif[]>([])

  useEffect(() => {
    setLoading(true)
    fetch(`/api/admin/laporan?mode=${mode}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [mode])

  useEffect(() => {
    fetch('/api/admin/notifications')
      .then(r => r.json())
      .then(d => setNotifs(d.notifications ?? []))
      .catch(() => {})
    fetch('/api/receptionist/dispensing')
      .then(r => r.json())
      .then(d => {
        const list = d.prescriptions ?? []
        setPrescStats({
          confirmed:  list.filter((p: any) => p.status === 'confirmed').length,
          dispensed:  list.filter((p: any) => p.status === 'dispensed').length,
        })
      })
      .catch(() => {})
  }, [])

  async function doExport(fmt = exportFormat, typ = exportType, period = exportPeriod) {
    setExporting(true)
    try {
      const params = new URLSearchParams({ format: fmt, type: typ, mode: period })
      if (period === 'custom') {
        if (exportFrom) params.set('date_from', exportFrom)
        if (exportTo)   params.set('date_to', exportTo)
      }
      const res  = await fetch(`/api/admin/laporan/export?${params}`)
      const blob = await res.blob()
      const a    = document.createElement('a')
      a.href     = URL.createObjectURL(blob)
      a.download = `laporan.${fmt === 'excel' ? 'xlsx' : 'csv'}`
      a.click()
    } catch { /* silent */ }
    setExporting(false)
  }

  const today = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const todayStr = new Date().toISOString().split('T')[0]
  const todayNotifs = notifs.filter(n => n.created_at.startsWith(todayStr))
  const nSent    = todayNotifs.filter(n => n.status === 'sent').length
  const nFailed  = todayNotifs.filter(n => n.status === 'failed').length
  const nPending = todayNotifs.filter(n => n.status === 'pending').length

  return (
    <>
    <div className="min-h-screen bg-background">
      <TopBar title="Laporan" subtitle="Rekap kinerja klinik" showSearch={false} />
      <div className="p-8">

        {/* Mode toggle */}
        <div className="flex items-center justify-between mb-7 flex-wrap gap-3">
          <div>
            <h2 className="text-xl font-black text-secondary">{mode === 'today' ? 'Laporan Hari Ini' : 'Laporan Bulan Ini'}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">{today}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex bg-white border border-gray-200 rounded-xl p-1 gap-1 shadow-sm">
              {(['today', 'month'] as const).map(m => (
                <button key={m} onClick={() => setMode(m)}
                  className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${mode === m ? 'bg-primary text-white shadow-sm' : 'text-gray-500 hover:text-secondary'}`}>
                  {m === 'today' ? 'Hari Ini' : 'Bulan Ini'}
                </button>
              ))}
            </div>
            <button onClick={() => doExport('csv', 'all', mode)} disabled={exporting}
              className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 rounded-xl text-sm font-bold hover:bg-gray-50 transition-colors disabled:opacity-50">
              <Download size={14} /> CSV
            </button>
            <button onClick={() => setShowExportModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-bold transition-colors">
              <FileSpreadsheet size={14} /> Excel
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !data ? (
          <div className="bg-white rounded-2xl p-16 text-center border border-gray-100">
            <p className="text-muted-foreground">Gagal memuat data</p>
          </div>
        ) : (
          <>
            {/* Stats grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
              {[
                { label: 'Total Pasien',      value: data.totalPasien, Icon: Users,        color: 'bg-blue-50 text-blue-600',     iconBg: 'bg-blue-100' },
                { label: 'Selesai',           value: data.selesai,     Icon: CheckCircle,  color: 'bg-emerald-50 text-emerald-600', iconBg: 'bg-emerald-100' },
                { label: 'Dibatalkan',        value: data.batal,       Icon: XCircle,      color: 'bg-red-50 text-red-500',       iconBg: 'bg-red-100' },
                { label: 'Masih Menunggu',   value: data.menunggu,    Icon: Clock,        color: 'bg-amber-50 text-amber-600',   iconBg: 'bg-amber-100' },
              ].map(s => (
                <div key={s.label} className={`rounded-2xl p-6 border border-transparent ${s.color}`}>
                  <div className={`w-10 h-10 ${s.iconBg} rounded-xl flex items-center justify-center mb-3`}>
                    <s.Icon size={18} className="opacity-80" />
                  </div>
                  <p className="text-[11px] uppercase tracking-widest font-bold opacity-60 mb-1">{s.label}</p>
                  <p className="text-4xl font-black tabular-nums">{s.value}</p>
                </div>
              ))}
            </div>

            {/* Revenue + Tipe */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-7">

              {/* Revenue cards */}
              <div className="lg:col-span-2 grid grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                      <DollarSign size={18} className="text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Revenue Lunas</p>
                    </div>
                  </div>
                  <p className="text-3xl font-black text-secondary tabular-nums">{fmtRupiah(data.revenue)}</p>
                  {Object.entries(data.byPayment).length > 0 && (
                    <div className="mt-4 space-y-2">
                      {Object.entries(data.byPayment).map(([method, amount]) => (
                        <div key={method} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${PAY_COLOR[method] ?? 'bg-gray-400'}`} />
                            <span className="font-semibold text-muted-foreground">{PAY_LABEL[method] ?? method}</span>
                          </div>
                          <span className="font-bold text-secondary">{fmtRupiah(amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                      <TrendingUp size={18} className="text-amber-600" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Pending</p>
                    </div>
                  </div>
                  <p className="text-3xl font-black text-secondary tabular-nums">{fmtRupiah(data.revenuePending)}</p>
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-muted-foreground">Walk-in</span>
                      <span className="font-bold text-secondary">{data.walkin} pasien</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-muted-foreground">Booking</span>
                      <span className="font-bold text-secondary">{data.booking} pasien</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tipe pie */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <p className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground mb-5">
                  Tipe Kunjungan
                </p>
                {data.totalPasien > 0 ? (
                  <>
                    <div className="relative flex items-center justify-center mb-5">
                      <svg width="120" height="120" viewBox="0 0 120 120">
                        {(() => {
                          const walkPct  = data.walkin / data.totalPasien
                          const bookPct  = data.booking / data.totalPasien
                          const r = 45; const cx = 60; const cy = 60
                          const circ = 2 * Math.PI * r
                          return (
                            <>
                              <circle cx={cx} cy={cy} r={r} fill="none" stroke="#E0F2FE" strokeWidth="18" />
                              <circle cx={cx} cy={cy} r={r} fill="none" stroke="#0891B2" strokeWidth="18"
                                strokeDasharray={`${walkPct * circ} ${circ}`}
                                strokeDashoffset={circ * 0.25}
                                style={{ transform: 'rotate(-90deg)', transformOrigin: '60px 60px' }} />
                              <circle cx={cx} cy={cy} r={r} fill="none" stroke="#6366F1" strokeWidth="18"
                                strokeDasharray={`${bookPct * circ} ${circ}`}
                                strokeDashoffset={-walkPct * circ + circ * 0.25}
                                style={{ transform: 'rotate(-90deg)', transformOrigin: '60px 60px' }} />
                              <text x={cx} y={cy+5} textAnchor="middle" className="font-black" fontSize="18" fontWeight="900" fill="#0C2340">
                                {data.totalPasien}
                              </text>
                            </>
                          )
                        })()}
                      </svg>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-primary" /><span className="font-semibold">Walk-in</span></div>
                        <span className="font-black">{data.walkin} <span className="text-xs text-muted-foreground font-normal">({Math.round(data.walkin/data.totalPasien*100)}%)</span></span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-violet-500" /><span className="font-semibold">Booking</span></div>
                        <span className="font-black">{data.booking} <span className="text-xs text-muted-foreground font-normal">({Math.round(data.booking/data.totalPasien*100)}%)</span></span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">Belum ada data</div>
                )}
              </div>
            </div>

            {/* Rekap Penjamin */}
            {data.byPenjamin && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-7">
                <p className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground mb-5">Rekap Penjamin</p>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { key: 'umum',     label: '💵 Umum',     color: 'bg-gray-100 text-gray-600' },
                    { key: 'bpjs',     label: '🏥 BPJS',     color: 'bg-cyan-100 text-cyan-700' },
                    { key: 'asuransi', label: '📋 Asuransi', color: 'bg-violet-100 text-violet-700' },
                  ].map(p => {
                    const count = data.byPenjamin?.[p.key] ?? 0
                    const pct   = data.totalPasien > 0 ? (count / data.totalPasien) * 100 : 0
                    return (
                      <div key={p.key} className={`rounded-xl p-4 ${p.color}`}>
                        <p className="text-sm font-bold mb-1">{p.label}</p>
                        <p className="text-3xl font-black">{count}</p>
                        <div className="h-1.5 bg-white/40 rounded-full mt-2 overflow-hidden">
                          <div className="h-full bg-current rounded-full opacity-60 transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <p className="text-xs font-bold mt-1 opacity-70">{Math.round(pct)}%</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Prescription Stats */}
            {prescStats && (prescStats.confirmed + prescStats.dispensed) > 0 && (
              <div className="flex items-center gap-4 mb-5 flex-wrap">
                <p className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground">Resep Hari Ini</p>
                <div className="flex gap-3">
                  <span className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-xl text-xs font-bold">📋 Dikonfirmasi: {prescStats.confirmed}</span>
                  <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold">✅ Dispensed: {prescStats.dispensed}</span>
                </div>
              </div>
            )}

            {/* WA Notification Stats */}
            {todayNotifs.length > 0 && (
              <div className="flex items-center gap-4 mb-7 flex-wrap">
                <p className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground">Notifikasi Terkirim Hari Ini</p>
                <div className="flex gap-3">
                  <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold">✅ Terkirim: {nSent}</span>
                  <span className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 rounded-xl text-xs font-bold">❌ Gagal: {nFailed}</span>
                  {nPending > 0 && <span className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-600 rounded-xl text-xs font-bold">⏳ Pending: {nPending}</span>}
                </div>
              </div>
            )}

            {/* Per Dokter */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 p-6 border-b border-gray-100">
                <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
                  <BarChart3 size={16} className="text-primary" />
                </div>
                <h3 className="font-black text-secondary">Kinerja Per Dokter</h3>
              </div>
              {data.byDoctor.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground text-sm">Belum ada data dokter</div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {data.byDoctor.map(doc => (
                    <div key={doc.doctor_id} className="p-5 flex items-center gap-5">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-white font-black text-sm flex-shrink-0">
                        {doc.full_name.split(' ').filter((w: string) => w !== 'Dr.').map((w: string) => w[0]).slice(0,2).join('')}
                      </div>
                      <div className="flex-1">
                        <p className="font-black text-secondary text-sm">{doc.full_name}</p>
                        <p className="text-xs text-muted-foreground">{doc.specialty}</p>
                      </div>
                      <div className="flex items-center gap-6 text-center">
                        <div><p className="text-2xl font-black text-secondary tabular-nums">{doc.total}</p><p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Total</p></div>
                        <div><p className="text-2xl font-black text-emerald-600 tabular-nums">{doc.selesai}</p><p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Selesai</p></div>
                        <div><p className="text-2xl font-black text-amber-500 tabular-nums">{doc.menunggu}</p><p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Menunggu</p></div>
                      </div>
                      {doc.total > 0 && (
                        <div className="w-24">
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full transition-all"
                              style={{ width: `${Math.round(doc.selesai/doc.total*100)}%` }} />
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-1 text-right font-bold">
                            {Math.round(doc.selesai/doc.total*100)}% selesai
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>

    {/* Export Modal */}
    {showExportModal && (
      <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowExportModal(false)}>
        <div className="bg-white rounded-2xl p-7 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-black text-gray-900 text-lg">Export Laporan</h3>
            <button onClick={() => setShowExportModal(false)}><X size={16} className="text-gray-500" /></button>
          </div>

          <div className="mb-4">
            <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-2">Tipe Data</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'appointments', label: 'Appointment' },
                { value: 'revenue',      label: 'Pendapatan'  },
                { value: 'medicines',    label: 'Stok Obat'   },
                { value: 'shifts',       label: 'Absensi'     },
                { value: 'all',          label: 'Semua'       },
              ].map(opt => (
                <button key={opt.value} onClick={() => setExportType(opt.value)}
                  className={`py-2 rounded-xl text-xs font-bold border-2 transition-all ${exportType === opt.value ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-2">Periode</p>
            <div className="flex gap-2 mb-2">
              {([
                { value: 'today', label: 'Hari Ini' },
                { value: 'month', label: 'Bulan Ini' },
                { value: 'custom', label: 'Custom' },
              ] as const).map(p => (
                <button key={p.value} onClick={() => setExportPeriod(p.value)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border-2 transition-all ${exportPeriod === p.value ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                  {p.label}
                </button>
              ))}
            </div>
            {exportPeriod === 'custom' && (
              <div className="grid grid-cols-2 gap-2">
                <input type="date" value={exportFrom} onChange={e => setExportFrom(e.target.value)}
                  className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                <input type="date" value={exportTo} onChange={e => setExportTo(e.target.value)}
                  className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
            )}
          </div>

          <div className="mb-5">
            <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-2">Format</p>
            <div className="flex gap-2">
              {['excel', 'csv'].map(f => (
                <button key={f} onClick={() => setExportFormat(f)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${exportFormat === f ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                  {f === 'excel' ? '📊 Excel' : '📄 CSV'}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => { setShowExportModal(false); doExport(exportFormat, exportType, exportPeriod) }}
            disabled={exporting}
            className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Download size={14} /> {exporting ? 'Mengunduh...' : 'Download'}
          </button>
        </div>
      </div>
    )}
    </>
  )
}
