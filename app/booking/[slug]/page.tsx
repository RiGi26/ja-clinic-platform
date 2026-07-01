'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ChevronLeft, Loader2, MapPin, Check } from 'lucide-react'
import Image from 'next/image'

type Clinic  = { id: string; name: string; address: string | null; phone: string | null; logo_url: string | null }
type Doctor  = { id: string; full_name: string; specialty: string; location_id: string | null }
type Branch  = { id: string; name: string; address: string | null }
type Slot    = { time: string; available: boolean }

const INPUT = 'w-full px-4 py-3.5 border border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary transition-all bg-white'
const LABEL = 'block text-sm font-bold text-gray-700 mb-2'

function getAvailableDates() {
  const dates: { date: string; dayName: string; dayNum: number; month: string }[] = []
  const base = new Date(); base.setDate(base.getDate() + 1)
  let count = 0
  while (count < 14) {
    if (base.getDay() !== 0) {
      dates.push({
        date:    base.toISOString().split('T')[0],
        dayName: new Intl.DateTimeFormat('id-ID', { weekday: 'short' }).format(new Date(base)),
        dayNum:  base.getDate(),
        month:   new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(new Date(base)),
      })
      count++
    }
    base.setDate(base.getDate() + 1)
  }
  return dates
}

function fmtDate(dateStr: string) {
  return new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(dateStr + 'T00:00:00'))
}

export default function BookingPage() {
  const params = useParams()
  const router = useRouter()
  const slug   = params.slug as string

  const [pageLoading, setPageLoading] = useState(true)
  const [notFound,    setNotFound]    = useState(false)
  const [clinic,      setClinic]      = useState<Clinic | null>(null)
  const [doctors,     setDoctors]     = useState<Doctor[]>([])
  const [branches,    setBranches]    = useState<Branch[]>([])
  const [slots,       setSlots]       = useState<Slot[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [submitting,  setSubmitting]  = useState(false)
  const [step,        setStep]        = useState(1)

  const [selBranch,   setSelBranch]   = useState<Branch | null>(null)
  const [selDoctor,   setSelDoctor]   = useState<Doctor | null>(null)
  const [selDate,     setSelDate]     = useState('')
  const [selTime,     setSelTime]     = useState('')

  const [form, setForm] = useState({ no_hp: '', nama_lengkap: '', tanggal_lahir: '', jenis_kelamin: '', keluhan: '' })
  const [existingPatient,  setExistingPatient]  = useState<string | null>(null)
  const [checkingPatient,  setCheckingPatient]  = useState(false)

  const dates = getAvailableDates()

  // A doctor belongs to exactly one branch, so a "branch step" is only meaningful
  // when the clinic has more than one active branch. Single-branch clinics keep
  // the original 5-step flow untouched (zero regression).
  const multiBranch = branches.length > 1
  const stepKeys = multiBranch
    ? ['branch', 'doctor', 'date', 'time', 'data', 'confirm']
    : ['doctor', 'date', 'time', 'data', 'confirm']
  const TOTAL_STEPS = stepKeys.length
  const currentKey  = stepKeys[step - 1]
  const visibleDoctors = multiBranch && selBranch
    ? doctors.filter(d => d.location_id === selBranch.id)
    : doctors

  useEffect(() => {
    fetch(`/api/booking/${slug}/info`)
      .then(r => r.json())
      .then(d => {
        if (d.error || !d.clinic) { setNotFound(true) }
        else { setClinic(d.clinic); setDoctors(d.doctors ?? []); setBranches(d.locations ?? []) }
      })
      .catch(() => setNotFound(true))
      .finally(() => setPageLoading(false))
  }, [slug])

  const loadSlots = useCallback(async () => {
    if (!selDoctor || !selDate) return
    setSlotsLoading(true)
    const res = await fetch(`/api/booking/${slug}/slots?doctor_id=${selDoctor.id}&date=${selDate}`)
    const d   = await res.json() as { slots?: Slot[] }
    setSlots(d.slots ?? [])
    setSlotsLoading(false)
  }, [selDoctor, selDate, slug])

  useEffect(() => { loadSlots() }, [loadSlots])

  const checkPatient = useCallback(async (phone: string) => {
    if (phone.length < 9) { setExistingPatient(null); return }
    setCheckingPatient(true)
    const res = await fetch(`/api/booking/${slug}/check-patient?phone=${phone}`)
    const d   = await res.json() as { found: boolean; name?: string }
    if (d.found && d.name) {
      setExistingPatient(d.name)
      setForm(f => ({ ...f, nama_lengkap: d.name! }))
    } else {
      setExistingPatient(null)
      setForm(f => ({ ...f, nama_lengkap: '' }))
    }
    setCheckingPatient(false)
  }, [slug])

  useEffect(() => {
    const timer = setTimeout(() => checkPatient(form.no_hp), 600)
    return () => clearTimeout(timer)
  }, [form.no_hp, checkPatient])

  async function handleSubmit() {
    setSubmitting(true)
    const res = await fetch(`/api/booking/${slug}/submit`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doctor_id: selDoctor!.id, date: selDate, time: selTime, ...form }),
    })
    const data = await res.json() as { booking_code?: string; doctor_name?: string; date?: string; time?: string; patient_name?: string; clinic_name?: string; branch_name?: string; error?: string }
    if (res.ok && data.booking_code) {
      const p = new URLSearchParams({
        code: data.booking_code, doctor: data.doctor_name!, date: data.date!,
        time: data.time!, patient: data.patient_name!, clinic: data.clinic_name!,
      })
      if (multiBranch && data.branch_name) p.set('branch', data.branch_name)
      router.push(`/booking/${slug}/confirmation?${p}`)
    } else {
      alert(data.error ?? 'Booking gagal, coba lagi')
      setSubmitting(false)
    }
  }

  // ─── Loading / Not Found ────────────────────────────────────────────────
  if (pageLoading) return (
    <div className="min-h-screen bg-[#F0F9FF] flex items-center justify-center">
      <Loader2 size={32} className="animate-spin text-primary" />
    </div>
  )

  if (notFound || !clinic) return (
    <div className="min-h-screen bg-[#F0F9FF] flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="text-5xl mb-4">🔗</div>
        <h1 className="text-xl font-black text-gray-800 mb-2">Link Tidak Aktif</h1>
        <p className="text-gray-500 text-sm">Link booking ini tidak tersedia atau telah dinonaktifkan. Silakan hubungi klinik secara langsung.</p>
      </div>
    </div>
  )

  // ─── Header ─────────────────────────────────────────────────────────────
  const header = (
    <header className="bg-white border-b border-gray-100 px-5 py-4 flex items-center gap-3">
      {clinic.logo_url
        ? <Image src={clinic.logo_url} alt={clinic.name} width={36} height={36} className="w-9 h-9 rounded-xl object-cover flex-shrink-0" />
        : <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white font-black text-sm flex-shrink-0">
            {clinic.name[0]}
          </div>
      }
      <div className="flex-1 min-w-0">
        <p className="font-black text-gray-900 text-sm truncate">{clinic.name}</p>
        {clinic.address && <p className="text-[11px] text-gray-400 truncate">{clinic.address}</p>}
      </div>
    </header>
  )

  // ─── Progress ────────────────────────────────────────────────────────────
  const progress = (
    <div className="flex items-center gap-1.5 px-5 py-4">
      {Array.from({ length: TOTAL_STEPS }, (_, i) => (
        <div key={i} className={`h-1.5 rounded-full flex-1 transition-all ${i + 1 <= step ? 'bg-primary' : 'bg-gray-200'}`} />
      ))}
      <span className="text-xs font-bold text-gray-400 ml-2 flex-shrink-0">{step}/{TOTAL_STEPS}</span>
    </div>
  )

  const card = (title: string, body: React.ReactNode, footer: React.ReactNode) => (
    <div className="flex flex-col min-h-[calc(100vh-120px)]">
      <div className="flex-1 px-5 pb-4">
        <h2 className="text-lg font-black text-gray-900 mb-5">{title}</h2>
        {body}
      </div>
      <div className="px-5 pb-8 pt-4 border-t border-gray-100 bg-white">{footer}</div>
    </div>
  )

  const nextBtn = (label: string, disabled: boolean, onClick: () => void) => (
    <button onClick={onClick} disabled={disabled}
      className="w-full py-4 bg-primary text-white font-black rounded-2xl text-base hover:bg-primary-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
      {label}
    </button>
  )

  const backBtn = step > 1 && (
    <button onClick={() => setStep(s => s - 1)}
      className="flex items-center gap-1.5 text-sm font-bold text-gray-500 mb-4 hover:text-gray-700 transition-colors">
      <ChevronLeft size={16} /> Kembali
    </button>
  )

  // ─── STEP (multi-branch only): Pilih Cabang ───────────────────────────
  if (currentKey === 'branch') return (
    <div className="min-h-screen bg-[#F0F9FF]">
      {header}{progress}
      {card('Pilih Cabang',
        <div className="space-y-3">
          {branches.map(b => (
            <button key={b.id} onClick={() => { setSelBranch(b); if (selBranch?.id !== b.id) setSelDoctor(null) }}
              className={`w-full text-left p-4 rounded-2xl border-2 transition-all flex items-center gap-4 ${selBranch?.id === b.id ? 'border-primary bg-primary/5' : 'border-gray-100 bg-white hover:border-primary/30'}`}>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-white flex-shrink-0">
                <MapPin size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-gray-900">{b.name}</p>
                {b.address && <p className="text-sm text-gray-500 truncate">{b.address}</p>}
              </div>
              {selBranch?.id === b.id && <Check size={18} className="text-primary flex-shrink-0" />}
            </button>
          ))}
        </div>,
        nextBtn('Pilih Dokter →', !selBranch, () => setStep(s => s + 1))
      )}
    </div>
  )

  // ─── STEP: Pilih Dokter ───────────────────────────────────────────────
  if (currentKey === 'doctor') return (
    <div className="min-h-screen bg-[#F0F9FF]">
      {header}{progress}
      {card('Pilih Dokter',
        <div>
          {backBtn}
          <div className="space-y-3">
            {visibleDoctors.length === 0
              ? <p className="text-gray-400 text-center py-8">Tidak ada dokter tersedia{multiBranch ? ' di cabang ini' : ''}</p>
              : visibleDoctors.map(d => (
                <button key={d.id} onClick={() => setSelDoctor(d)}
                  className={`w-full text-left p-4 rounded-2xl border-2 transition-all flex items-center gap-4 ${selDoctor?.id === d.id ? 'border-primary bg-primary/5' : 'border-gray-100 bg-white hover:border-primary/30'}`}>
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-white font-black text-base flex-shrink-0">
                    {d.full_name.split(' ').filter(w => w !== 'Dr.' && w !== 'dr.').map(w => w[0]).slice(0, 2).join('')}
                  </div>
                  <div className="flex-1">
                    <p className="font-black text-gray-900">dr. {d.full_name}</p>
                    <p className="text-sm text-gray-500">{d.specialty}</p>
                  </div>
                  {selDoctor?.id === d.id && <Check size={18} className="text-primary flex-shrink-0" />}
                </button>
              ))
            }
          </div>
        </div>,
        nextBtn('Pilih Tanggal →', !selDoctor, () => setStep(s => s + 1))
      )}
    </div>
  )

  // ─── STEP: Pilih Tanggal ───────────────────────────────────────────────
  if (currentKey === 'date') return (
    <div className="min-h-screen bg-[#F0F9FF]">
      {header}{progress}
      {card('Pilih Tanggal',
        <div>
          {backBtn}
          <div className="grid grid-cols-3 gap-2.5">
            {dates.map(d => (
              <button key={d.date} onClick={() => { setSelDate(d.date); setSelTime('') }}
                className={`py-3 rounded-2xl border-2 transition-all text-center ${selDate === d.date ? 'border-primary bg-primary text-white' : 'border-gray-100 bg-white text-gray-700 hover:border-primary/30'}`}>
                <p className="text-[11px] font-bold opacity-70">{d.dayName}</p>
                <p className="text-xl font-black">{d.dayNum}</p>
                <p className="text-[11px] font-bold opacity-70">{d.month}</p>
              </button>
            ))}
          </div>
        </div>,
        nextBtn('Pilih Jam →', !selDate, () => setStep(s => s + 1))
      )}
    </div>
  )

  // ─── STEP: Pilih Jam ────────────────────────────────────────────────────
  if (currentKey === 'time') return (
    <div className="min-h-screen bg-[#F0F9FF]">
      {header}{progress}
      {card('Pilih Jam',
        <div>
          {backBtn}
          {selDate && <p className="text-sm text-gray-500 mb-4">{fmtDate(selDate)}</p>}
          {slotsLoading
            ? <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-primary" /></div>
            : <div className="grid grid-cols-3 gap-2.5">
                {slots.map(s => (
                  <button key={s.time} disabled={!s.available}
                    onClick={() => setSelTime(s.time)}
                    className={`py-3 rounded-2xl border-2 font-bold text-sm transition-all ${
                      !s.available ? 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed' :
                      selTime === s.time ? 'border-primary bg-primary text-white' :
                      'border-gray-100 bg-white text-gray-700 hover:border-primary/30'
                    }`}>
                    {s.time}
                  </button>
                ))}
              </div>
          }
        </div>,
        nextBtn('Isi Data Diri →', !selTime, () => setStep(s => s + 1))
      )}
    </div>
  )

  // ─── STEP: Data Diri ────────────────────────────────────────────────────
  if (currentKey === 'data') return (
    <div className="min-h-screen bg-[#F0F9FF]">
      {header}{progress}
      {card('Data Diri',
        <div className="space-y-4">
          {backBtn}
          <div>
            <label className={LABEL}>No. HP / WhatsApp *</label>
            <div className="relative">
              <input type="tel" value={form.no_hp}
                onChange={e => setForm(f => ({ ...f, no_hp: e.target.value }))}
                placeholder="08xxxxxxxxxx" className={INPUT} />
              {checkingPatient && <Loader2 size={16} className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-gray-400" />}
              {existingPatient && <Check size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500" />}
            </div>
            {existingPatient && (
              <p className="text-xs text-emerald-600 font-medium mt-1">✓ Pasien ditemukan: {existingPatient}</p>
            )}
          </div>
          <div>
            <label className={LABEL}>Nama Lengkap *</label>
            <input value={form.nama_lengkap} onChange={e => setForm(f => ({ ...f, nama_lengkap: e.target.value }))}
              placeholder="Nama sesuai identitas" className={INPUT} />
          </div>
          {!existingPatient && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={LABEL}>Tanggal Lahir</label>
                  <input type="date" value={form.tanggal_lahir} onChange={e => setForm(f => ({ ...f, tanggal_lahir: e.target.value }))} className={INPUT} />
                </div>
                <div>
                  <label className={LABEL}>Jenis Kelamin</label>
                  <select value={form.jenis_kelamin} onChange={e => setForm(f => ({ ...f, jenis_kelamin: e.target.value }))} className={INPUT}>
                    <option value="">Pilih...</option>
                    <option value="male">Laki-laki</option>
                    <option value="female">Perempuan</option>
                  </select>
                </div>
              </div>
            </>
          )}
          <div>
            <label className={LABEL}>Keluhan Utama *</label>
            <textarea rows={3} value={form.keluhan} onChange={e => setForm(f => ({ ...f, keluhan: e.target.value }))}
              placeholder="Ceritakan keluhan Anda..." className={`${INPUT} resize-none`} />
          </div>
        </div>,
        nextBtn('Konfirmasi →', !form.no_hp || !form.nama_lengkap || !form.keluhan, () => setStep(s => s + 1))
      )}
    </div>
  )

  // ─── STEP: Konfirmasi ───────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F0F9FF]">
      {header}{progress}
      {card('Konfirmasi Booking',
        <div>
          {backBtn}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
            {([
              ['Klinik',   clinic.name],
              ...(multiBranch && selBranch ? [['Cabang', selBranch.name] as [string, string]] : []),
              ['Dokter',   `dr. ${selDoctor?.full_name}`],
              ['Tanggal',  fmtDate(selDate)],
              ['Jam',      `${selTime} WIB`],
              ['Pasien',   form.nama_lengkap],
              ['No. HP',   form.no_hp],
              ['Keluhan',  form.keluhan],
            ] as [string, string][]).map(([label, value]) => (
              <div key={label} className="flex items-start gap-3">
                <p className="text-sm text-gray-500 w-20 flex-shrink-0">{label}</p>
                <p className="text-sm font-bold text-gray-900 flex-1">{value}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 text-center mt-4">
            Dengan menekan Konfirmasi, Anda menyetujui jadwal booking di atas.
            Kode booking akan dikirim via WhatsApp.
          </p>
        </div>,
        <button onClick={handleSubmit} disabled={submitting}
          className="w-full py-4 bg-primary text-white font-black rounded-2xl text-base hover:bg-primary-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
          {submitting ? <><Loader2 size={18} className="animate-spin" /> Memproses...</> : '✓ Konfirmasi Booking'}
        </button>
      )}
    </div>
  )
}
