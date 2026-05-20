'use client'

import { useSearchParams, useParams } from 'next/navigation'
import { useState, Suspense } from 'react'
import { CheckCircle, Copy, Check, CalendarPlus, RotateCcw } from 'lucide-react'

function fmtDateLong(dateStr: string) {
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date(dateStr + 'T00:00:00'))
}

function buildCalendarUrl(p: { clinic: string; doctor: string; date: string; time: string; code: string }) {
  const [h, m] = p.time.split(':').map(Number)
  const start  = new Date(`${p.date}T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00`)
  const end    = new Date(start.getTime() + 60 * 60 * 1000)
  const fmt    = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0]
  return (
    `https://calendar.google.com/calendar/render?action=TEMPLATE` +
    `&text=${encodeURIComponent(`Appointment ${p.clinic}`)}` +
    `&dates=${fmt(start)}/${fmt(end)}` +
    `&details=${encodeURIComponent(`Dokter: ${p.doctor}\nKode: ${p.code}`)}`
  )
}

function ConfirmationContent() {
  const params  = useParams()
  const search  = useSearchParams()
  const slug    = params.slug as string

  const code    = search.get('code')    ?? ''
  const doctor  = search.get('doctor')  ?? ''
  const date    = search.get('date')    ?? ''
  const time    = search.get('time')    ?? ''
  const patient = search.get('patient') ?? ''
  const clinic  = search.get('clinic')  ?? ''

  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code)
    } catch {
      const el = document.createElement('textarea')
      el.value = code
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const calUrl = date && time
    ? buildCalendarUrl({ clinic, doctor, date, time, code })
    : null

  return (
    <div className="min-h-screen bg-[#F0F9FF] flex flex-col items-center justify-start px-4 pt-8 pb-12">

      {/* Header klinik */}
      <div className="w-full max-w-md mb-6">
        <div className="flex items-center gap-2 text-sm font-bold text-[#0891B2]">
          <div className="w-7 h-7 rounded-lg bg-[#0891B2] flex items-center justify-center text-white text-xs font-black flex-shrink-0">
            {clinic ? clinic[0].toUpperCase() : 'K'}
          </div>
          <span className="truncate">{clinic || 'Klinik'}</span>
        </div>
      </div>

      {/* Badge sukses */}
      <div className="flex flex-col items-center mb-8 text-center">
        <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
          <CheckCircle size={44} className="text-emerald-500" strokeWidth={1.8} />
        </div>
        <h1 className="text-2xl font-black text-gray-900 mb-1">Booking Berhasil!</h1>
        <p className="text-gray-500 text-sm">Simpan kode booking Anda di bawah ini</p>
      </div>

      {/* Box utama */}
      <div className="w-full max-w-md bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-5">

        {/* Kode booking */}
        <div className="bg-[#0891B2] px-6 pt-6 pb-5 text-center">
          <p className="text-[#BAE6FD] text-xs font-bold uppercase tracking-widest mb-2">Kode Booking</p>
          <p className="font-mono text-3xl font-black text-white tracking-wider mb-4 select-all">
            {code || '—'}
          </p>
          <button
            onClick={handleCopy}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all ${
              copied ? 'bg-emerald-400 text-white' : 'bg-white/20 text-white hover:bg-white/30'
            }`}
          >
            {copied ? <><Check size={15} />Tersalin!</> : <><Copy size={15} />Salin Kode</>}
          </button>
        </div>

        {/* Detail booking */}
        <div className="px-6 py-5 space-y-3.5">
          {([
            ['Dokter',  doctor  ? `dr. ${doctor}` : '—'],
            ['Tanggal', date    ? fmtDateLong(date) : '—'],
            ['Jam',     time    ? `${time} WIB` : '—'],
            ['Pasien',  patient || '—'],
          ] as [string, string][]).map(([label, value]) => (
            <div key={label} className="flex items-start gap-3">
              <p className="text-sm text-gray-400 w-16 flex-shrink-0">{label}</p>
              <p className="text-sm font-bold text-gray-900 flex-1">{value}</p>
            </div>
          ))}
        </div>

        {/* Info box */}
        <div className="mx-5 mb-5 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex gap-2.5">
          <span className="text-lg flex-shrink-0">⚠️</span>
          <p className="text-xs text-amber-800 font-medium leading-relaxed">
            Tunjukkan kode ini kepada receptionist saat tiba di klinik.
            Harap hadir 10 menit sebelum jadwal.
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="w-full max-w-md space-y-3">
        {calUrl && (
          <a
            href={calUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2.5 w-full py-3.5 rounded-2xl border-2 border-[#0891B2] text-[#0891B2] font-bold text-sm hover:bg-[#0891B2]/5 transition-colors"
          >
            <CalendarPlus size={18} /> Tambah ke Google Calendar
          </a>
        )}
        <a
          href={`/booking/${slug}`}
          className="flex items-center justify-center gap-2.5 w-full py-3.5 rounded-2xl bg-gray-100 text-gray-600 font-bold text-sm hover:bg-gray-200 transition-colors"
        >
          <RotateCcw size={16} /> Booking Lagi
        </a>
      </div>

      <p className="text-xs text-gray-400 text-center mt-8">
        Konfirmasi booking juga dikirim via WhatsApp ke nomor Anda
      </p>
    </div>
  )
}

export default function ConfirmationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F0F9FF] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-[#0891B2] border-t-transparent animate-spin" />
      </div>
    }>
      <ConfirmationContent />
    </Suspense>
  )
}
