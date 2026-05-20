'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, UserCheck, Plus, X } from 'lucide-react'
import Link from 'next/link'

type Appointment = {
  id: string; scheduled_at: string; status: string; complaint: string | null; queue_number: number | null
  patients: { id: string; full_name: string; no_rm: string; phone: string | null } | null
  doctors:  { id: string; full_name: string; specialty: string } | null
}
type Doctor   = { id: string; full_name: string; specialty: string }
type Patient  = { id: string; full_name: string; no_rm: string; phone: string | null }

const INPUT  = 'w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all'
const LABEL  = 'text-[10px] uppercase tracking-widest font-bold text-muted-foreground block mb-2'

function fmtTime(iso: string) {
  return new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
}

export default function CheckInPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading,      setLoading]      = useState(true)
  const [search,       setSearch]       = useState('')
  const [toast,        setToast]        = useState<string | null>(null)
  const [checkinResult, setCheckinResult] = useState<{ name: string; queue: number } | null>(null)

  // Walk-in modal
  const [showWalkin,   setShowWalkin]   = useState(false)
  const [doctors,      setDoctors]      = useState<Doctor[]>([])
  const [patSearch,    setPatSearch]    = useState('')
  const [patResults,   setPatResults]   = useState<Patient[]>([])
  const [selPatient,   setSelPatient]   = useState<Patient | null>(null)
  const [walkinForm,   setWalkinForm]   = useState({ doctor_id: '', complaint: '', time: '' })
  const [submitting,   setSubmitting]   = useState(false)

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 4000) }

  const load = useCallback(async () => {
    const res = await fetch('/api/receptionist/checkin')
    const d   = await res.json() as { appointments?: Appointment[] }
    setAppointments(d.appointments ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!showWalkin) return
    fetch('/api/admin/clinic-doctors').then(r => r.json()).then(d => setDoctors(d.doctors ?? []))
  }, [showWalkin])

  useEffect(() => {
    if (!patSearch.trim()) { setPatResults([]); return }
    const timer = setTimeout(async () => {
      const res = await fetch(`/api/receptionist/patients?q=${encodeURIComponent(patSearch)}`)
      const d   = await res.json() as { patients?: Patient[] }
      setPatResults(d.patients ?? [])
    }, 300)
    return () => clearTimeout(timer)
  }, [patSearch])

  async function handleCheckIn(apt: Appointment) {
    const res  = await fetch('/api/receptionist/checkin', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appointment_id: apt.id }),
    })
    const data = await res.json() as { queue_number?: number }
    if (res.ok) {
      setCheckinResult({ name: (apt.patients as any)?.full_name ?? '', queue: data.queue_number ?? 0 })
      load()
    } else {
      showToast('Gagal check-in')
    }
  }

  async function handleWalkin() {
    if (!selPatient || !walkinForm.doctor_id || !walkinForm.time) return
    setSubmitting(true)
    const res = await fetch('/api/admin/walkin', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: selPatient.full_name, phone: selPatient.phone,
        doctor_id: walkinForm.doctor_id, complaint: walkinForm.complaint,
        time: walkinForm.time,
      }),
    })
    const data = await res.json() as { success?: boolean; queue?: number; no_rm?: string; error?: string }
    if (res.ok) {
      showToast(`Walk-in berhasil! No. Antrian: ${data.queue}`)
      setShowWalkin(false)
      load()
    } else {
      showToast(data.error ?? 'Gagal')
    }
    setSubmitting(false)
  }

  const filtered = appointments.filter(a => {
    const q = search.toLowerCase()
    if (!q) return true
    return (a.patients as any)?.full_name?.toLowerCase().includes(q) ||
           (a.patients as any)?.no_rm?.toLowerCase().includes(q) ||
           (a.patients as any)?.phone?.includes(q)
  })

  const pending  = filtered.filter(a => a.status === 'menunggu')
  const checkedIn = filtered.filter(a => ['dipanggil', 'diperiksa', 'selesai'].includes(a.status))

  return (
    <div>
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-gray-900 text-white px-5 py-3 rounded-2xl shadow-xl font-bold text-sm">{toast}</div>
      )}

      {/* Check-in success popup */}
      {checkinResult && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setCheckinResult(null)}>
          <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-2xl text-center" onClick={e => e.stopPropagation()}>
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserCheck size={28} className="text-emerald-600" />
            </div>
            <h3 className="font-black text-secondary text-xl mb-1">Check-in Berhasil!</h3>
            <p className="text-muted-foreground text-sm mb-4">{checkinResult.name}</p>
            <div className="bg-primary/5 rounded-2xl p-4 mb-6">
              <p className="text-[10px] uppercase tracking-widest font-bold text-primary mb-1">Nomor Antrian</p>
              <p className="text-5xl font-black text-primary">{String(checkinResult.queue).padStart(3, '0')}</p>
            </div>
            <button onClick={() => setCheckinResult(null)}
              className="w-full py-3 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary-hover transition-colors">
              Tutup
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-secondary">Check-in Pasien</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Konfirmasi kedatangan pasien dan daftarkan walk-in</p>
        </div>
        <button onClick={() => setShowWalkin(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary-hover transition-colors">
          <Plus size={14} /> Pasien Walk-in
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Cari nama, No. RM, atau No. HP..."
          className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary shadow-sm" />
      </div>

      {loading ? (
        <div className="py-16 text-center text-muted-foreground text-sm">Memuat...</div>
      ) : (
        <div className="space-y-6">
          {/* Belum Check-in */}
          <div>
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">
              Belum Check-in ({pending.length})
            </h2>
            {pending.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center border border-gray-100 text-sm text-muted-foreground">
                Semua pasien sudah check-in
              </div>
            ) : (
              <div className="space-y-3">
                {pending.map(a => (
                  <div key={a.id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-secondary">{(a.patients as any)?.full_name}</p>
                      <p className="text-xs text-muted-foreground">{(a.patients as any)?.no_rm} · {(a.patients as any)?.phone ?? '—'}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {fmtTime(a.scheduled_at)} · {(a.doctors as any)?.full_name}
                        {a.complaint && ` · ${a.complaint}`}
                      </p>
                    </div>
                    {a.queue_number && (
                      <span className="text-xs font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-full">
                        Antrian #{a.queue_number}
                      </span>
                    )}
                    <button onClick={() => handleCheckIn(a)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors whitespace-nowrap">
                      <UserCheck size={14} /> Check-in
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sudah Check-in */}
          {checkedIn.length > 0 && (
            <div>
              <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">
                Sudah Check-in ({checkedIn.length})
              </h2>
              <div className="space-y-2">
                {checkedIn.map(a => (
                  <div key={a.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center gap-4 opacity-70">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <UserCheck size={14} className="text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-700 text-sm">{(a.patients as any)?.full_name}</p>
                      <p className="text-xs text-gray-400">{fmtTime(a.scheduled_at)} · {(a.doctors as any)?.full_name}</p>
                    </div>
                    {a.queue_number && <span className="text-xs font-bold text-gray-400">#{a.queue_number}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Walk-in Modal */}
      {showWalkin && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setShowWalkin(false)}>
          <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-7 py-5 border-b border-gray-100">
              <h3 className="font-black text-gray-900 text-lg">Daftarkan Walk-in</h3>
              <button onClick={() => setShowWalkin(false)}><X size={18} className="text-gray-400" /></button>
            </div>
            <div className="p-7 space-y-4">
              {/* Patient search */}
              <div>
                <label className={LABEL}>Cari Pasien *</label>
                {selPatient ? (
                  <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-xl">
                    <div className="flex-1">
                      <p className="font-bold text-secondary text-sm">{selPatient.full_name}</p>
                      <p className="text-xs text-muted-foreground">{selPatient.no_rm}</p>
                    </div>
                    <button onClick={() => { setSelPatient(null); setPatSearch('') }}
                      className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
                  </div>
                ) : (
                  <>
                    <input value={patSearch} onChange={e => setPatSearch(e.target.value)}
                      placeholder="Cari nama, No. HP, No. RM..." className={INPUT} />
                    {patResults.length > 0 && (
                      <div className="mt-1 border border-gray-200 rounded-xl overflow-hidden">
                        {patResults.map(p => (
                          <button key={p.id} onClick={() => { setSelPatient(p); setPatSearch(''); setPatResults([]) }}
                            className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0">
                            <p className="font-bold text-gray-800">{p.full_name}</p>
                            <p className="text-xs text-gray-400">{p.no_rm} · {p.phone ?? '—'}</p>
                          </button>
                        ))}
                      </div>
                    )}
                    {patSearch && patResults.length === 0 && (
                      <div className="mt-2 text-xs text-muted-foreground flex items-center gap-2">
                        Pasien tidak ditemukan?{' '}
                        <Link href="/receptionist/patients/new" className="text-primary font-bold hover:underline">
                          Daftar Pasien Baru
                        </Link>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div>
                <label className={LABEL}>Dokter *</label>
                <select value={walkinForm.doctor_id} onChange={e => setWalkinForm(f => ({ ...f, doctor_id: e.target.value }))} className={INPUT}>
                  <option value="">Pilih dokter...</option>
                  {doctors.map(d => <option key={d.id} value={d.id}>{d.full_name} — {d.specialty}</option>)}
                </select>
              </div>

              <div>
                <label className={LABEL}>Jam Kunjungan *</label>
                <input type="time" value={walkinForm.time} onChange={e => setWalkinForm(f => ({ ...f, time: e.target.value }))} className={INPUT} />
              </div>

              <div>
                <label className={LABEL}>Keluhan</label>
                <input value={walkinForm.complaint} onChange={e => setWalkinForm(f => ({ ...f, complaint: e.target.value }))}
                  placeholder="Keluhan utama..." className={INPUT} />
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowWalkin(false)} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm">Batal</button>
                <button onClick={handleWalkin} disabled={submitting || !selPatient || !walkinForm.doctor_id || !walkinForm.time}
                  className="flex-1 py-3 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary-hover transition-colors disabled:opacity-50">
                  {submitting ? 'Mendaftarkan...' : 'Daftarkan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
