'use client'

import { useState, useTransition } from 'react'
import TopBar from '@/components/TopBar'
import { Plus, X, ChevronDown } from 'lucide-react'

const DAY_NAMES  = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
const WORK_DAYS  = [1, 2, 3, 4, 5, 6] // Senin–Sabtu
const DOC_COLORS = ['bg-cyan-500', 'bg-purple-500', 'bg-emerald-500', 'bg-orange-500', 'bg-rose-500', 'bg-indigo-500']

type Doctor   = { id: string; full_name: string; specialty: string; is_active: boolean }
type Schedule = { id: string; doctor_id: string; day_of_week: number; day_name: string; start_time: string; end_time: string; max_patients: number; is_active: boolean }

function docColor(idx: number) { return DOC_COLORS[idx % DOC_COLORS.length] }

export default function ScheduleClient({ doctors, schedules: initSchedules, clinicId }: {
  doctors: Doctor[]; schedules: Schedule[]; clinicId: string
}) {
  const [schedules, setSchedules]   = useState<Schedule[]>(initSchedules)
  const [showForm, setShowForm]     = useState(false)
  const [form, setForm]             = useState({ doctor_id: '', day_of_week: '1', start_time: '08:00', end_time: '17:00', max_patients: '10' })
  const [pending, startTransition]  = useTransition()
  const [error, setError]           = useState('')

  const activeDoctors = doctors.filter(d => d.is_active)

  async function handleAdd() {
    setError('')
    startTransition(async () => {
      const res = await fetch('/api/admin/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctor_id   : form.doctor_id,
          day_of_week : parseInt(form.day_of_week),
          start_time  : form.start_time,
          end_time    : form.end_time,
          max_patients: parseInt(form.max_patients),
        }),
      })
      if (res.ok) {
        // Reload schedules
        const r = await fetch('/api/admin/schedule')
        const d = await r.json()
        setSchedules(d.schedules ?? [])
        setShowForm(false)
        setForm({ doctor_id: '', day_of_week: '1', start_time: '08:00', end_time: '17:00', max_patients: '10' })
      } else {
        const d = await res.json()
        setError(d.error ?? 'Gagal menambah jadwal')
      }
    })
  }

  async function handleDelete(id: string) {
    startTransition(async () => {
      const res = await fetch('/api/admin/schedule', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (res.ok) setSchedules(prev => prev.filter(s => s.id !== id))
    })
  }

  const getSlots = (dayOfWeek: number) => schedules.filter(s => s.day_of_week === dayOfWeek)

  return (
    <div className="min-h-screen bg-background">
      <TopBar title="Jadwal Dokter" subtitle="Kelola jadwal praktik dokter" />
      <div className="p-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-7">
          <h2 className="text-xl font-black text-secondary">Jadwal Mingguan</h2>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-5 py-3 bg-primary text-white rounded-xl font-bold text-sm shadow-sm hover:bg-primary-hover transition-colors">
            <Plus size={16} /> Tambah Jadwal
          </button>
        </div>

        {/* Add Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
            <div className="bg-white rounded-2xl p-7 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-black text-secondary">Tambah Jadwal Praktek</h3>
                <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
              </div>

              {error && <p className="text-sm text-red-500 mb-4 font-medium">{error}</p>}

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground block mb-2">Dokter</label>
                  <div className="relative">
                    <select value={form.doctor_id} onChange={e => setForm(f => ({ ...f, doctor_id: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary appearance-none">
                      <option value="">-- Pilih Dokter --</option>
                      {activeDoctors.map(d => <option key={d.id} value={d.id}>{d.full_name} — {d.specialty}</option>)}
                    </select>
                    <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground block mb-2">Hari</label>
                  <div className="relative">
                    <select value={form.day_of_week} onChange={e => setForm(f => ({ ...f, day_of_week: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary appearance-none">
                      {WORK_DAYS.map(d => <option key={d} value={d}>{DAY_NAMES[d]}</option>)}
                    </select>
                    <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground block mb-2">Mulai</label>
                    <input type="time" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground block mb-2">Selesai</label>
                    <input type="time" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground block mb-2">Maks Pasien</label>
                  <input type="number" min="1" max="50" value={form.max_patients}
                    onChange={e => setForm(f => ({ ...f, max_patients: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowForm(false)}
                  className="flex-1 py-3 bg-gray-100 text-secondary rounded-xl font-bold text-sm hover:bg-gray-200 transition-colors">
                  Batal
                </button>
                <button onClick={handleAdd} disabled={pending || !form.doctor_id}
                  className="flex-1 py-3 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary-hover transition-colors disabled:opacity-50">
                  {pending ? 'Menyimpan...' : 'Simpan Jadwal'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Calendar Grid */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-7">
          <div className="grid grid-cols-7 border-b border-gray-100">
            <div className="p-4 bg-gray-50 border-r border-gray-100">
              <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Hari</span>
            </div>
            {WORK_DAYS.map(d => (
              <div key={d} className="p-4 bg-gray-50 border-r border-gray-100 last:border-r-0 text-center">
                <span className="text-sm font-black text-secondary">{DAY_NAMES[d]}</span>
              </div>
            ))}
          </div>

          {/* Slots */}
          <div className="grid grid-cols-7">
            <div className="p-4 border-r border-gray-100 bg-gray-50">
              <span className="text-xs font-bold text-muted-foreground">Jadwal</span>
            </div>
            {WORK_DAYS.map(d => {
              const slots = getSlots(d)
              return (
                <div key={d} className="p-2 border-r border-gray-50 last:border-r-0 min-h-[140px]">
                  {slots.length === 0 ? (
                    <div className="h-full flex items-center justify-center">
                      <p className="text-[10px] text-gray-300 font-bold">Libur</p>
                    </div>
                  ) : (
                    slots.map((s, si) => {
                      const docIdx = doctors.findIndex(doc => doc.id === s.doctor_id)
                      const doc    = doctors[docIdx]
                      return (
                        <div key={s.id}
                          className={`${docColor(docIdx)} text-white rounded-xl p-2.5 mb-1.5 group relative`}>
                          <p className="text-[11px] font-black mb-0.5 leading-tight truncate">{doc?.full_name?.replace('Dr. ', '') ?? '—'}</p>
                          <p className="text-[10px] text-white/80 font-semibold">{s.start_time.slice(0,5)}–{s.end_time.slice(0,5)}</p>
                          <p className="text-[10px] text-white/70">Maks {s.max_patients} pasien</p>
                          <button
                            onClick={() => handleDelete(s.id)}
                            className="absolute top-1.5 right-1.5 hidden group-hover:flex w-5 h-5 bg-white/20 hover:bg-white/40 rounded-lg items-center justify-center transition-colors"
                          >
                            <X size={10} className="text-white" />
                          </button>
                        </div>
                      )
                    })
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Doctor cards */}
        <h3 className="text-base font-black text-secondary mb-4">Dokter Aktif</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {activeDoctors.map((doc, i) => {
            const docSchedules = schedules.filter(s => s.doctor_id === doc.id)
            return (
              <div key={doc.id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-4 mb-4">
                  <div className={`w-12 h-12 rounded-xl ${docColor(i)} flex items-center justify-center text-white font-black text-base flex-shrink-0`}>
                    {doc.full_name.split(' ').filter(w => w !== 'Dr.').map(w => w[0]).slice(0,2).join('')}
                  </div>
                  <div>
                    <p className="font-black text-secondary text-sm">{doc.full_name}</p>
                    <p className="text-xs text-muted-foreground font-semibold">{doc.specialty}</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {docSchedules.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Belum ada jadwal</p>
                  ) : (
                    docSchedules.map(s => (
                      <div key={s.id} className="flex items-center justify-between">
                        <span className="text-xs font-bold text-secondary">{s.day_name}</span>
                        <span className="text-xs text-muted-foreground">{s.start_time.slice(0,5)}–{s.end_time.slice(0,5)}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
