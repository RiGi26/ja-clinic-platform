'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, X, Loader2 } from 'lucide-react'

type Slot = { time: string; available: boolean }

type Props = {
  appointmentId: string
  doctorId: string | null
  doctorName: string
}

const DAY_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']

function nextDates(n = 7): Date[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i)
    d.setHours(0, 0, 0, 0)
    return d
  })
}

function toDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function UpcomingActions({ appointmentId, doctorId, doctorName }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const dates = nextDates(7)
  const [selectedDate, setSelectedDate] = useState<Date>(dates[0])
  const [slots, setSlots] = useState<Slot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)

  // Close modal on Escape
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  // Load slots when modal opens or the date changes
  useEffect(() => {
    if (!open || !doctorId) return
    let active = true
    setLoadingSlots(true)
    setSelectedTime(null)
    fetch(`/api/patient/appointments/slots?doctor_id=${doctorId}&date=${toDateKey(selectedDate)}`)
      .then(r => r.json())
      .then((d: { slots?: Slot[] }) => { if (active) setSlots(d.slots ?? []) })
      .catch(() => { if (active) setSlots([]) })
      .finally(() => { if (active) setLoadingSlots(false) })
    return () => { active = false }
  }, [open, doctorId, selectedDate])

  async function handleCancel() {
    if (!confirm('Batalkan janji temu ini? Tindakan ini tidak bisa dibatalkan kembali.')) return
    setCancelling(true)
    setError(null)
    try {
      const res = await fetch(`/api/patient/appointments/${appointmentId}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Gagal membatalkan')
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal membatalkan')
      setCancelling(false)
    }
  }

  async function handleReschedule() {
    if (!selectedTime) return
    setSaving(true)
    setError(null)
    try {
      const [h, m] = selectedTime.split(':').map(Number)
      const dt = new Date(selectedDate)
      dt.setHours(h, m, 0, 0)
      const res = await fetch(`/api/patient/appointments/${appointmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduled_at: dt.toISOString() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Gagal menjadwalkan ulang')
      setOpen(false)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menjadwalkan ulang')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="flex flex-wrap gap-4 items-center">
        <button
          onClick={() => { setError(null); setOpen(true) }}
          disabled={!doctorId}
          className="bg-white text-black px-6 py-2.5 rounded-full font-bold text-sm hover:bg-gray-100 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Jadwalkan Ulang
        </button>
        <button
          onClick={handleCancel}
          disabled={cancelling}
          className="bg-white/10 text-white border border-white/20 px-6 py-2.5 rounded-full font-bold text-sm hover:bg-white/20 transition-all inline-flex items-center gap-2 disabled:opacity-50"
        >
          {cancelling && <Loader2 size={15} className="animate-spin" />}
          {cancelling ? 'Membatalkan…' : 'Batalkan'}
        </button>
        {error && !open && <span className="text-sm text-red-300">{error}</span>}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Jadwalkan ulang janji temu"
        >
          <div
            className="bg-white text-[#1D1D1F] rounded-[28px] w-full max-w-lg max-h-[88vh] overflow-y-auto p-6 md:p-8 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl sf-display-heavy tracking-tight">Jadwalkan Ulang</h3>
                <p className="text-sm text-gray-500 mt-0.5">{doctorName || 'Dokter Klinik'}</p>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Tutup" className="p-2 -mr-2 -mt-2 text-gray-400 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>

            {/* Date chips */}
            <p className="text-[11px] uppercase tracking-widest font-bold text-gray-400 mb-3">Pilih Tanggal</p>
            <div className="grid grid-cols-7 gap-2 mb-6">
              {dates.map(d => {
                const selected = toDateKey(d) === toDateKey(selectedDate)
                return (
                  <button
                    key={toDateKey(d)}
                    onClick={() => setSelectedDate(d)}
                    className={`py-2.5 rounded-xl border-2 text-center transition-all ${selected ? 'border-apple-blue bg-apple-blue text-white' : 'border-gray-100 hover:border-apple-blue/30'}`}
                  >
                    <span className="block text-[10px] font-bold uppercase">{DAY_NAMES[d.getDay()]}</span>
                    <span className="block text-base font-bold tabular-nums">{d.getDate()}</span>
                  </button>
                )
              })}
            </div>

            {/* Time slots */}
            <p className="text-[11px] uppercase tracking-widest font-bold text-gray-400 mb-3">Pilih Waktu</p>
            {loadingSlots ? (
              <div className="py-10 flex justify-center text-gray-400"><Loader2 className="animate-spin" /></div>
            ) : slots.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">Tidak ada slot tersedia di tanggal ini.</p>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {slots.map(s => (
                  <button
                    key={s.time}
                    disabled={!s.available}
                    onClick={() => setSelectedTime(s.time)}
                    className={`py-2 rounded-lg border text-sm font-semibold tabular-nums transition-all ${
                      selectedTime === s.time
                        ? 'border-apple-blue bg-apple-blue text-white'
                        : s.available
                          ? 'border-gray-200 hover:border-apple-blue/40'
                          : 'border-gray-100 text-gray-300 line-through cursor-not-allowed'
                    }`}
                  >
                    {s.time}
                  </button>
                ))}
              </div>
            )}

            {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

            <div className="mt-8 flex gap-3">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 py-3 rounded-full border border-gray-200 font-bold text-sm hover:bg-gray-50 transition-all"
              >
                Batal
              </button>
              <button
                onClick={handleReschedule}
                disabled={!selectedTime || saving}
                className="flex-1 py-3 rounded-full bg-apple-blue text-white font-bold text-sm inline-flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-apple-blue/90 transition-all"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Calendar size={16} />}
                {saving ? 'Menyimpan…' : 'Konfirmasi Jadwal Baru'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
