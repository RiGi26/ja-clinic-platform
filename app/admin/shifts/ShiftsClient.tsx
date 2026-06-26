'use client'

import { useState, useEffect, useCallback } from 'react'
import TopBar from '@/components/TopBar'
import { ChevronLeft, ChevronRight, X, Download, RefreshCw } from 'lucide-react'

type ShiftRecord = {
  id: string; user_id: string; date: string; shift: string; status: string; notes: string | null
  users: { full_name: string; role: string } | null
}
type StaffUser    = { id: string; full_name: string; role: string }
type ReportStaff  = { user_id: string; full_name: string; role: string; hadir: number; izin: number; sakit: number; alpha: number; pagi: number; siang: number; malam: number; attendance_rate: number }
type Template     = { user_id: string; day_of_week: number; shift: string; users: { full_name: string; role: string } | null }

const SHIFT_LABEL: Record<string, string> = { pagi: 'Pagi', siang: 'Siang', malam: 'Malam', libur: 'Libur' }
const SHIFT_SHORT: Record<string, string> = { pagi: 'P', siang: 'S', malam: 'M', libur: 'L' }
const SHIFT_COLOR: Record<string, string> = {
  pagi:  'bg-cyan-100 text-cyan-700',
  siang: 'bg-amber-100 text-amber-700',
  malam: 'bg-violet-100 text-violet-700',
  libur: 'bg-gray-100 text-gray-500',
}
const STATUS_DOT: Record<string, string> = {
  hadir: 'bg-green-500', izin: 'bg-yellow-400',
  sakit: 'bg-blue-400',  alpha: 'bg-red-500', libur: 'bg-gray-300',
}
const STATUS_LABEL: Record<string, string> = { hadir: 'Hadir', izin: 'Izin', sakit: 'Sakit', alpha: 'Alpha', libur: 'Libur' }
const STATUS_BADGE: Record<string, string> = {
  hadir: 'bg-emerald-100 text-emerald-700',
  izin:  'bg-yellow-100 text-yellow-700',
  sakit: 'bg-blue-100 text-blue-700',
  alpha: 'bg-red-100 text-red-600',
  libur: 'bg-gray-100 text-gray-500',
}
const ROLE_BADGE: Record<string, string> = {
  admin: 'bg-blue-100 text-blue-700', doctor: 'bg-green-100 text-green-700',
  receptionist: 'bg-violet-100 text-violet-700',
}
const DAY_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']

function currentMonth() { return new Date().toISOString().slice(0, 7) }

type Tab = 'calendar' | 'rekap' | 'template'
type EditState = { userId: string; date: string; name: string; existing?: ShiftRecord }

export default function ShiftsPage() {
  const [tab,    setTab]    = useState<Tab>('calendar')
  const [month,  setMonth]  = useState(currentMonth())
  const [shifts, setShifts] = useState<ShiftRecord[]>([])
  const [staff,  setStaff]  = useState<StaffUser[]>([])
  const [report, setReport] = useState<ReportStaff[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading,   setLoading]   = useState(false)
  const [toast,     setToast]     = useState<string | null>(null)

  // Edit modal
  const [editState, setEditState] = useState<EditState | null>(null)
  const [editForm,  setEditForm]  = useState({ shift: 'pagi', status: 'hadir', notes: '' })
  const [saving,    setSaving]    = useState(false)

  // Template dirty tracking
  const [templateChanges, setTemplateChanges] = useState<Map<string, string>>(new Map())
  const [savingTmpl, setSavingTmpl] = useState(false)

  // Export state
  const [exporting, setExporting] = useState(false)

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 3000) }

  // Derived month info
  const [year, mon] = month.split('-').map(Number)
  const daysInMonth = new Date(year, mon, 0).getDate()
  const dates = Array.from({ length: daysInMonth }, (_, i) => {
    const d = new Date(year, mon - 1, i + 1)
    return { dateStr: d.toISOString().split('T')[0], day: i + 1, dow: d.getDay() }
  })

  function prevMonth() {
    const d = new Date(year, mon - 2, 1)
    setMonth(d.toISOString().slice(0, 7))
  }
  function nextMonth() {
    const d = new Date(year, mon, 1)
    setMonth(d.toISOString().slice(0, 7))
  }
  const monthLabel = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(new Date(year, mon - 1, 1))

  // Load shifts + staff
  const loadShifts = useCallback(async () => {
    setLoading(true)
    const [shiftRes, staffRes] = await Promise.all([
      fetch(`/api/admin/shifts?month=${month}`).then(r => r.json()),
      fetch('/api/admin/clinic-doctors?include_all=true').then(r => r.json()).catch(() => ({ doctors: [] })),
    ])
    setShifts(shiftRes.data ?? [])

    // Also fetch admin/receptionist users
    const staffRes2 = await fetch(`/api/admin/shifts/report?month=${month}`).then(r => r.json())
    const reportData = staffRes2.staff ?? []
    setReport(reportData)
    setStaff(reportData.map((s: ReportStaff) => ({ id: s.user_id, full_name: s.full_name, role: s.role })))
    setLoading(false)
  }, [month])

  const loadTemplates = useCallback(async () => {
    const res = await fetch('/api/admin/shifts/template').then(r => r.json())
    setTemplates(res.data ?? [])
  }, [])

  useEffect(() => { loadShifts() }, [loadShifts])
  useEffect(() => { if (tab === 'template') loadTemplates() }, [tab, loadTemplates])

  // Build shift map: userId → date → ShiftRecord
  const shiftMap = new Map<string, Map<string, ShiftRecord>>()
  for (const s of shifts) {
    if (!shiftMap.has(s.user_id)) shiftMap.set(s.user_id, new Map())
    shiftMap.get(s.user_id)!.set(s.date, s)
  }

  // Build template map: `${userId}-${dow}` → shift
  const tmplMap = new Map<string, string>()
  for (const t of templates) tmplMap.set(`${t.user_id}-${t.day_of_week}`, t.shift)
  for (const [k, v] of templateChanges) tmplMap.set(k, v)

  function openEdit(userId: string, dateStr: string, name: string) {
    const existing = shiftMap.get(userId)?.get(dateStr)
    setEditState({ userId, date: dateStr, name, existing })
    setEditForm({
      shift:  existing?.shift  ?? 'pagi',
      status: existing?.status ?? 'hadir',
      notes:  existing?.notes  ?? '',
    })
  }

  async function saveShift() {
    if (!editState) return
    setSaving(true)
    await fetch('/api/admin/shifts', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: editState.userId, date: editState.date, ...editForm }),
    })
    showToast('Shift berhasil disimpan')
    setEditState(null)
    loadShifts()
    setSaving(false)
  }

  async function handleGenerate() {
    const res  = await fetch('/api/admin/shifts', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month }),
    })
    const data = await res.json() as { generated?: number }
    showToast(`${data.generated ?? 0} shift di-generate dari template`)
    loadShifts()
  }

  function onTemplateChange(userId: string, dow: number, shift: string) {
    const key = `${userId}-${dow}`
    setTemplateChanges(prev => new Map(prev).set(key, shift))
  }

  async function saveTemplates() {
    setSavingTmpl(true)
    const promises = Array.from(templateChanges.entries()).map(([key, shift]) => {
      const [userId, dowStr] = key.split('-')
      if (!shift) {
        return fetch('/api/admin/shifts/template', {
          method: 'DELETE', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId, day_of_week: parseInt(dowStr) }),
        })
      }
      return fetch('/api/admin/shifts/template', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, day_of_week: parseInt(dowStr), shift }),
      })
    })
    await Promise.all(promises)
    setTemplateChanges(new Map())
    showToast('Template tersimpan')
    loadTemplates()
    setSavingTmpl(false)
  }

  async function handleExport(format: 'csv' | 'excel') {
    setExporting(true)
    const firstDay = `${month}-01`
    const lastDay  = new Date(year, mon, 0).toISOString().split('T')[0]
    const url = `/api/admin/laporan/export?format=${format}&type=shifts&mode=custom&date_from=${firstDay}&date_to=${lastDay}`
    try {
      const res  = await fetch(url)
      const blob = await res.blob()
      const a    = document.createElement('a')
      a.href     = URL.createObjectURL(blob)
      a.download = `absensi-${month}.${format === 'excel' ? 'xlsx' : 'csv'}`
      a.click()
    } catch { showToast('Export gagal') }
    setExporting(false)
  }

  return (
    <div className="min-h-screen bg-background">
      <TopBar title="Jadwal & Absensi Staf" subtitle="Kelola shift dan kehadiran" showSearch={false} />
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-gray-900 text-white px-5 py-3 rounded-2xl shadow-xl font-bold text-sm">{toast}</div>
      )}

      <div className="p-6 lg:p-8">
        {/* Header controls */}
        <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
          <div className="flex items-center gap-3">
            <button onClick={prevMonth} className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
              <ChevronLeft size={16} className="text-gray-600" />
            </button>
            <span className="font-black text-secondary text-base capitalize min-w-32 text-center">{monthLabel}</span>
            <button onClick={nextMonth} className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
              <ChevronRight size={16} className="text-gray-600" />
            </button>
            <button onClick={loadShifts} className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
              <RefreshCw size={14} className={loading ? 'animate-spin text-primary' : 'text-gray-400'} />
            </button>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={handleGenerate}
              className="px-4 py-2 text-sm font-bold bg-primary text-white rounded-xl hover:bg-primary-hover transition-colors">
              Generate dari Template
            </button>
            <button onClick={() => handleExport('excel')} disabled={exporting}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50">
              <Download size={14} /> Excel
            </button>
            <button onClick={() => handleExport('csv')} disabled={exporting}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50">
              <Download size={14} /> CSV
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-6 overflow-x-auto">
          {([
            { id: 'calendar', label: '📅 Kalender' },
            { id: 'rekap',    label: '📊 Rekap Bulanan' },
            { id: 'template', label: '⚙️ Template Shift' },
          ] as { id: Tab; label: string }[]).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-5 py-3 font-bold text-sm whitespace-nowrap transition-all ${tab === t.id ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-secondary'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* CALENDAR TAB */}
        {tab === 'calendar' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {loading ? (
              <div className="py-16 text-center text-muted-foreground text-sm">Memuat...</div>
            ) : staff.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground text-sm">Belum ada staf terdaftar</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="text-xs border-collapse" style={{ minWidth: `${180 + daysInMonth * 40}px` }}>
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="sticky left-0 bg-gray-50 z-10 px-4 py-3 text-left font-bold text-gray-500 text-[10px] uppercase tracking-widest w-44 border-r border-gray-100">Staf</th>
                      {dates.map(d => (
                        <th key={d.dateStr} className={`px-1 py-2 w-9 text-center ${d.dow === 0 ? 'bg-red-50' : ''}`}>
                          <div className="text-[9px] font-bold text-gray-400">{DAY_NAMES[d.dow]}</div>
                          <div className="text-sm font-black text-gray-700">{d.day}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {staff.map(s => (
                      <tr key={s.id} className="border-t border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="sticky left-0 bg-white z-10 px-4 py-2.5 border-r border-gray-100">
                          <p className="font-bold text-gray-800 text-xs truncate max-w-[160px]">{s.full_name}</p>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${ROLE_BADGE[s.role] ?? 'bg-gray-100 text-gray-500'}`}>
                            {s.role}
                          </span>
                        </td>
                        {dates.map(d => {
                          const sr = shiftMap.get(s.id)?.get(d.dateStr)
                          return (
                            <td key={d.dateStr}
                              onClick={() => openEdit(s.id, d.dateStr, s.full_name)}
                              className={`px-0.5 py-1.5 text-center cursor-pointer hover:bg-primary/5 transition-colors border-r border-gray-50 ${d.dow === 0 ? 'bg-red-50/50' : ''}`}>
                              {sr ? (
                                <div className="flex flex-col items-center gap-0.5">
                                  <span className={`px-1 py-0.5 rounded text-[9px] font-black ${SHIFT_COLOR[sr.shift]}`}>
                                    {SHIFT_SHORT[sr.shift]}
                                  </span>
                                  <div className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[sr.status]}`} />
                                </div>
                              ) : (
                                <span className="text-gray-200 text-base leading-none hover:text-gray-400">+</span>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {/* Legend */}
            <div className="px-6 py-3 border-t border-gray-100 flex flex-wrap gap-4 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                {Object.entries(SHIFT_COLOR).map(([k, v]) => (
                  <span key={k} className={`px-2 py-0.5 rounded font-bold ${v}`}>{SHIFT_SHORT[k]} = {SHIFT_LABEL[k]}</span>
                ))}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {Object.entries(STATUS_DOT).map(([k, v]) => (
                  <span key={k} className="flex items-center gap-1 font-medium text-gray-500">
                    <div className={`w-2 h-2 rounded-full ${v}`} /> {STATUS_LABEL[k]}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* REKAP TAB */}
        {tab === 'rekap' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-black text-secondary text-sm">Rekap Kehadiran — {monthLabel}</h3>
            </div>
            {loading ? (
              <div className="py-16 text-center text-muted-foreground text-sm">Memuat...</div>
            ) : report.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground text-sm">Belum ada data</div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        {['Nama Staf', 'Role', 'Hadir', 'Izin', 'Sakit', 'Alpha', '% Kehadiran'].map(h => (
                          <th key={h} className="text-left text-[10px] uppercase tracking-widest font-bold text-gray-400 px-5 py-3 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {report.map(r => (
                        <tr key={r.user_id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-5 py-3 font-bold text-gray-800">{r.full_name}</td>
                          <td className="px-5 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${ROLE_BADGE[r.role] ?? 'bg-gray-100 text-gray-500'}`}>{r.role}</span>
                          </td>
                          <td className="px-5 py-3 font-bold text-emerald-600">{r.hadir}</td>
                          <td className="px-5 py-3 font-bold text-yellow-600">{r.izin}</td>
                          <td className="px-5 py-3 font-bold text-blue-500">{r.sakit}</td>
                          <td className="px-5 py-3 font-bold text-red-500">{r.alpha}</td>
                          <td className="px-5 py-3 w-40">
                            <div className="flex items-center gap-3">
                              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${r.attendance_rate >= 80 ? 'bg-emerald-500' : r.attendance_rate >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                                  style={{ width: `${r.attendance_rate}%` }}
                                />
                              </div>
                              <span className={`text-xs font-black w-10 text-right ${r.attendance_rate >= 80 ? 'text-emerald-600' : r.attendance_rate >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                                {r.attendance_rate}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 border-t border-gray-200">
                      <tr>
                        <td className="px-5 py-3 font-black text-gray-700 text-xs" colSpan={2}>TOTAL</td>
                        <td className="px-5 py-3 font-black text-emerald-600">{report.reduce((a, r) => a + r.hadir, 0)}</td>
                        <td className="px-5 py-3 font-black text-yellow-600">{report.reduce((a, r) => a + r.izin, 0)}</td>
                        <td className="px-5 py-3 font-black text-blue-500">{report.reduce((a, r) => a + r.sakit, 0)}</td>
                        <td className="px-5 py-3 font-black text-red-500">{report.reduce((a, r) => a + r.alpha, 0)}</td>
                        <td className="px-5 py-3" />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {/* TEMPLATE TAB */}
        {tab === 'template' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-black text-secondary text-sm">Template Shift Mingguan</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Jadwal default per hari — digunakan untuk generate shift bulanan</p>
              </div>
              <div className="flex gap-2">
                {templateChanges.size > 0 && (
                  <button onClick={saveTemplates} disabled={savingTmpl}
                    className="px-4 py-2 text-sm font-bold bg-primary text-white rounded-xl hover:bg-primary-hover transition-colors disabled:opacity-50">
                    {savingTmpl ? 'Menyimpan...' : `Simpan (${templateChanges.size})`}
                  </button>
                )}
                <button onClick={handleGenerate}
                  className="px-4 py-2 text-sm font-bold bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors">
                  Generate Bulan Ini
                </button>
              </div>
            </div>
            {staff.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground text-sm">Belum ada staf</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left text-[10px] uppercase tracking-widest font-bold text-gray-400 px-5 py-3">Staf</th>
                      {DAY_NAMES.map((d, i) => (
                        <th key={i} className={`text-center text-[10px] uppercase tracking-widest font-bold px-2 py-3 ${i === 0 ? 'text-red-400' : 'text-gray-400'}`}>{d}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {staff.map(s => (
                      <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-5 py-2.5">
                          <p className="font-bold text-gray-800 text-sm">{s.full_name}</p>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${ROLE_BADGE[s.role] ?? 'bg-gray-100 text-gray-500'}`}>{s.role}</span>
                        </td>
                        {[0,1,2,3,4,5,6].map(dow => {
                          const val = tmplMap.get(`${s.id}-${dow}`) ?? ''
                          return (
                            <td key={dow} className={`px-2 py-2.5 text-center ${dow === 0 ? 'bg-red-50/50' : ''}`}>
                              <select value={val} onChange={e => onTemplateChange(s.id, dow, e.target.value)}
                                className={`text-xs font-bold px-2 py-1.5 rounded-lg border border-gray-200 cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary ${val ? SHIFT_COLOR[val] : 'text-gray-300'}`}>
                                <option value="">—</option>
                                <option value="pagi">Pagi</option>
                                <option value="siang">Siang</option>
                                <option value="malam">Malam</option>
                                <option value="libur">Libur</option>
                              </select>
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Shift Modal */}
      {editState && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setEditState(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-black text-gray-900">{editState.name}</h3>
                <p className="text-xs text-gray-400">{editState.date}</p>
              </div>
              <button onClick={() => setEditState(null)}><X size={16} className="text-gray-400" /></button>
            </div>

            <div className="mb-4">
              <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-2">Shift</p>
              <div className="grid grid-cols-4 gap-2">
                {(['pagi', 'siang', 'malam', 'libur'] as const).map(s => (
                  <button key={s} onClick={() => setEditForm(f => ({ ...f, shift: s, status: s === 'libur' ? 'libur' : f.status === 'libur' ? 'hadir' : f.status }))}
                    className={`py-2 rounded-xl font-bold text-xs capitalize border-2 transition-all ${editForm.shift === s ? `border-transparent ${SHIFT_COLOR[s]}` : 'border-gray-200 text-gray-500'}`}>
                    {SHIFT_LABEL[s]}
                  </button>
                ))}
              </div>
            </div>

            {editForm.shift !== 'libur' && (
              <div className="mb-4">
                <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-2">Status</p>
                <div className="grid grid-cols-4 gap-2">
                  {(['hadir', 'izin', 'sakit', 'alpha'] as const).map(s => (
                    <button key={s} onClick={() => setEditForm(f => ({ ...f, status: s }))}
                      className={`py-2 rounded-xl font-bold text-xs capitalize border-2 transition-all ${editForm.status === s ? `border-transparent ${STATUS_BADGE[s]}` : 'border-gray-200 text-gray-500'}`}>
                      {STATUS_LABEL[s]}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mb-4">
              <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-2">Catatan</p>
              <input value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Opsional..." className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all" />
            </div>

            <div className="flex gap-3">
              <button onClick={() => setEditState(null)} className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm">Batal</button>
              <button onClick={saveShift} disabled={saving}
                className="flex-1 py-2.5 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary-hover transition-colors disabled:opacity-50">
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
