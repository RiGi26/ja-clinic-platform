'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import TopBar from '@/components/TopBar'
import { Star, Loader2, CheckCircle } from 'lucide-react'

const STEP_LABELS = ['Pilih Dokter', 'Pilih Jadwal', 'Konfirmasi']

type Doctor = {
  id: string; full_name: string; specialty: string; consultation_fee: number; bio: string|null
  schedules: { day_of_week: number; start_time: string; end_time: string }[]
  availableToday: boolean
}
type Sub = { id: string; package_name: string; sessions_total: number; sessions_remaining: number; expires_at: string | null }

function fmtRupiah(n: number) {
  if (n >= 1_000_000) return `Rp ${(n/1_000_000).toFixed(1).replace('.0','')}jt`
  if (n >= 1_000)     return `Rp ${(n/1_000).toFixed(0)}rb`
  return `Rp ${n.toLocaleString('id-ID')}`
}
function avatarGrad(name: string) {
  const c = ['from-cyan-400 to-blue-500','from-violet-400 to-purple-600','from-emerald-400 to-teal-600','from-orange-400 to-red-500']
  return c[(name ?? '').split('').reduce((a,x) => a+x.charCodeAt(0),0) % c.length]
}

function generateDates(n = 7) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i)
    return d
  })
}

function generateSlots(startTime: string, endTime: string): string[] {
  const slots: string[] = []
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  let cur = sh * 60 + sm
  const end = eh * 60 + em
  while (cur < end) {
    const h = String(Math.floor(cur / 60)).padStart(2, '0')
    const m = String(cur % 60).padStart(2, '0')
    slots.push(`${h}:${m}`)
    cur += 30
  }
  return slots
}

export default function BookingPage() {
  const router = useRouter()
  const [doctors,        setDoctors]        = useState<Doctor[]>([])
  const [loading,        setLoading]        = useState(true)
  const [submitting,     setSubmitting]     = useState(false)
  const [success,        setSuccess]        = useState(false)
  const [error,          setError]          = useState('')

  const [step,           setStep]           = useState(1)
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null)
  const [selectedDate,   setSelectedDate]   = useState<Date | null>(null)
  const [selectedTime,   setSelectedTime]   = useState<string | null>(null)
  const [keluhan,        setKeluhan]        = useState('')
  const [subscriptions,  setSubscriptions]  = useState<Sub[]>([])
  const [selectedSub,    setSelectedSub]    = useState<Sub | null>(null)
  const [remaining,      setRemaining]      = useState<number | null>(null)

  const dates = generateDates(7)

  useEffect(() => {
    fetch('/api/patient/booking')
      .then(r => r.json())
      .then(d => { setDoctors(d.doctors ?? []); setLoading(false) })
      .catch(() => setLoading(false))
    fetch('/api/patient/subscriptions')
      .then(r => r.json())
      .then(d => setSubscriptions(d.subscriptions ?? []))
      .catch(() => {})
  }, [])

  const availableSlots = (() => {
    if (!selectedDoctor || !selectedDate) return []
    const dow = selectedDate.getDay()
    const sched = selectedDoctor.schedules.find(s => s.day_of_week === dow)
    if (!sched) return []
    return generateSlots(sched.start_time, sched.end_time)
  })()

  const isDayAvailable = (date: Date) => {
    if (!selectedDoctor) return false
    return selectedDoctor.schedules.some(s => s.day_of_week === date.getDay())
  }

  const canNext = step === 1 ? !!selectedDoctor
               : step === 2 ? !!(selectedDate && selectedTime)
               : true

  async function handleConfirm() {
    if (!selectedDoctor || !selectedDate || !selectedTime) return
    setSubmitting(true)
    setError('')

    const [h, m] = selectedTime.split(':').map(Number)
    const dt = new Date(selectedDate)
    dt.setHours(h, m, 0, 0)

    const res = await fetch('/api/patient/booking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        doctor_id     : selectedDoctor.id,
        scheduled_at  : dt.toISOString(),
        complaint     : keluhan || null,
        subscription_id: selectedSub?.id ?? null,
      }),
    })
    const data = await res.json()
    setSubmitting(false)
    if (res.ok) {
      setRemaining(typeof data.sessions_remaining === 'number' ? data.sessions_remaining : null)
      setSuccess(true)
      setTimeout(() => router.push('/patient'), 2500)
    } else {
      setError(data.error ?? 'Gagal membuat appointment')
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
            <CheckCircle size={40} className="text-emerald-600" />
          </div>
          <h2 className="text-2xl font-black text-secondary">Appointment Terdaftar!</h2>
          {remaining !== null
            ? <p className="text-muted-foreground">1 sesi paket dipakai · <span className="font-bold text-secondary">{remaining} sesi tersisa</span></p>
            : <p className="text-muted-foreground">Kembali ke dashboard...</p>}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <TopBar title="Buat Appointment" subtitle="Jadwalkan kunjungan Anda" showSearch={false} />

      <div className="p-8 max-w-4xl mx-auto">

        {/* Stepper */}
        <div className="flex items-center justify-center mb-10">
          {[1,2,3].map(s => (
            <div key={s} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className={`w-11 h-11 rounded-full flex items-center justify-center font-black text-sm transition-all ${step >= s ? 'bg-primary text-white' : 'bg-gray-200 text-gray-400'}`}>{s}</div>
                <span className={`text-[10px] font-bold mt-1.5 ${step >= s ? 'text-primary' : 'text-gray-400'}`}>{STEP_LABELS[s-1]}</span>
              </div>
              {s < 3 && <div className={`w-20 h-1 mb-4 mx-2 rounded-full ${step > s ? 'bg-primary' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        {/* Step 1 */}
        {step === 1 && (
          <div>
            <h2 className="text-2xl font-black text-secondary mb-5">Pilih Dokter</h2>
            {loading ? (
              <div className="flex items-center justify-center py-20"><Loader2 size={28} className="animate-spin text-primary" /></div>
            ) : doctors.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                <p className="text-muted-foreground">Belum ada dokter tersedia</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {doctors.map(doc => (
                  <div key={doc.id} onClick={() => setSelectedDoctor(doc)}
                    className={`bg-white rounded-2xl p-5 border-2 cursor-pointer transition-all ${selectedDoctor?.id === doc.id ? 'border-primary shadow-lg' : 'border-gray-100 hover:border-gray-200'}`}>
                    <div className="flex items-start gap-4">
                      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${avatarGrad(doc.full_name)} flex items-center justify-center text-white font-black text-base flex-shrink-0`}>
                        {doc.full_name.split(' ').filter(w => w !== 'Dr.').map(w=>w[0]).slice(0,2).join('').toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-black text-secondary mb-0.5">{doc.full_name}</h3>
                        <p className="text-sm text-muted-foreground font-semibold mb-2">{doc.specialty}</p>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1">
                            <Star size={14} className="text-amber-400 fill-amber-400" />
                            <span className="text-sm font-bold text-secondary">4.8</span>
                          </div>
                          <span className="text-sm font-bold text-primary">{fmtRupiah(doc.consultation_fee)}</span>
                          {doc.availableToday && (
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full text-[11px] font-bold">Tersedia hari ini</span>
                          )}
                        </div>
                        {doc.schedules.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {['Min','Sen','Sel','Rab','Kam','Jum','Sab'].map((name, idx) =>
                              doc.schedules.some(s => s.day_of_week === idx) ? (
                                <span key={idx} className="px-1.5 py-0.5 bg-primary/10 text-primary rounded text-[10px] font-bold">{name}</span>
                              ) : null
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && selectedDoctor && (
          <div>
            <h2 className="text-2xl font-black text-secondary mb-5">Pilih Tanggal & Waktu</h2>
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-5">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-black text-secondary">Pilih Tanggal</h3>
              </div>
              <div className="grid grid-cols-7 gap-2 mb-5">
                {dates.map(d => {
                  const avail    = isDayAvailable(d)
                  const selected = selectedDate?.toDateString() === d.toDateString()
                  const dayNames = ['Min','Sen','Sel','Rab','Kam','Jum','Sab']
                  return (
                    <button key={d.toISOString()} onClick={() => { if (avail) { setSelectedDate(d); setSelectedTime(null) } }}
                      disabled={!avail}
                      className={`py-3 rounded-xl border-2 transition-all text-center ${selected ? 'border-primary bg-primary text-white' : avail ? 'border-gray-100 hover:border-primary/30' : 'border-gray-50 opacity-40 cursor-not-allowed'}`}>
                      <p className="text-[10px] font-bold mb-1">{dayNames[d.getDay()]}</p>
                      <p className="text-xl font-black">{d.getDate()}</p>
                    </button>
                  )
                })}
              </div>

              {selectedDate && availableSlots.length > 0 && (
                <div>
                  <h3 className="text-sm font-black text-secondary mb-3">Pilih Waktu</h3>
                  <div className="grid grid-cols-6 gap-2">
                    {availableSlots.map(t => (
                      <button key={t} onClick={() => setSelectedTime(t)}
                        className={`py-2.5 rounded-xl border-2 font-bold text-sm transition-all ${selectedTime === t ? 'border-primary bg-primary text-white' : 'border-gray-100 hover:border-primary/30'}`}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {selectedDate && availableSlots.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Dokter tidak praktek di hari ini</p>
              )}
            </div>
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && selectedDoctor && (
          <div>
            <h2 className="text-2xl font-black text-secondary mb-5">Konfirmasi Appointment</h2>
            <div className="bg-white rounded-2xl p-7 border border-gray-100 shadow-sm mb-5">
              <div className="flex items-center gap-4 pb-5 border-b border-gray-100 mb-5">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${avatarGrad(selectedDoctor.full_name)} flex items-center justify-center text-white font-black text-lg flex-shrink-0`}>
                  {selectedDoctor.full_name.split(' ').filter(w => w !== 'Dr.').map(w=>w[0]).slice(0,2).join('').toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-black text-secondary">{selectedDoctor.full_name}</h3>
                  <p className="text-sm text-muted-foreground font-semibold">{selectedDoctor.specialty}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-5 mb-5">
                <div>
                  <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-1">Tanggal</p>
                  <p className="text-sm font-bold text-secondary">
                    {selectedDate?.toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-1">Waktu</p>
                  <p className="text-sm font-bold text-secondary">{selectedTime} WIB</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-1">Biaya Konsultasi</p>
                  <p className="text-sm font-bold text-primary">{fmtRupiah(selectedDoctor.consultation_fee)}</p>
                </div>
              </div>

              {subscriptions.length > 0 && (
                <div className="mb-5">
                  <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-2">Bayar Dengan</p>
                  <div className="space-y-2">
                    <button type="button" onClick={() => setSelectedSub(null)}
                      className={`w-full text-left p-3 rounded-xl border-2 transition-all ${!selectedSub ? 'border-primary bg-primary/5' : 'border-gray-100 hover:border-primary/30'}`}>
                      <span className="font-bold text-sm text-secondary">Bayar biasa</span>
                      <span className="text-xs text-muted-foreground ml-2">Konsultasi {fmtRupiah(selectedDoctor.consultation_fee)}</span>
                    </button>
                    {subscriptions.map(s => (
                      <button key={s.id} type="button" onClick={() => setSelectedSub(s)}
                        className={`w-full text-left p-3 rounded-xl border-2 transition-all ${selectedSub?.id === s.id ? 'border-primary bg-primary/5' : 'border-gray-100 hover:border-primary/30'}`}>
                        <span className="font-bold text-sm text-secondary">{s.package_name}</span>
                        <span className="text-xs text-emerald-600 font-bold ml-2">{s.sessions_remaining}/{s.sessions_total} sesi tersisa</span>
                      </button>
                    ))}
                  </div>
                  {selectedSub && <p className="text-xs text-muted-foreground mt-2">1 sesi paket akan dipakai untuk kunjungan ini.</p>}
                </div>
              )}

              <div>
                <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground block mb-2">Keluhan (opsional)</label>
                <textarea value={keluhan} onChange={e => setKeluhan(e.target.value)} rows={3}
                  placeholder="Ceritakan keluhan atau alasan kunjungan Anda..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all resize-none" />
              </div>
              {error && <p className="text-sm text-red-500 mt-3 font-medium">{error}</p>}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3">
          {step > 1 && (
            <button onClick={() => setStep(s => s - 1)}
              className="px-6 py-3 bg-white border border-gray-200 text-secondary rounded-xl hover:bg-gray-50 transition-colors font-bold text-sm">
              ← Kembali
            </button>
          )}
          <button
            onClick={() => step < 3 ? setStep(s => s + 1) : handleConfirm()}
            disabled={!canNext || submitting}
            className="flex-1 py-3 bg-primary text-white rounded-xl hover:bg-primary-hover transition-colors font-bold text-sm shadow-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? <><Loader2 size={16} className="animate-spin" /> Memproses...</> : step < 3 ? 'Lanjut →' : 'Konfirmasi Appointment'}
          </button>
        </div>
      </div>
    </div>
  )
}
