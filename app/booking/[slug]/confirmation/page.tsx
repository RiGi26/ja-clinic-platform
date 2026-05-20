'use client'

import { Suspense } from 'react'
import { useSearchParams, useParams } from 'next/navigation'
import { CheckCircle, Copy, Calendar, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import Link from 'next/link'

function fmtDate(dateStr: string) {
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date(dateStr + 'T00:00:00'))
}

function ConfirmationContent() {
  const searchParams = useSearchParams()
  const params       = useParams()
  const slug         = params.slug as string
  const [copied, setCopied] = useState(false)

  const code    = searchParams.get('code')    ?? ''
  const doctor  = searchParams.get('doctor')  ?? ''
  const date    = searchParams.get('date')    ?? ''
  const time    = searchParams.get('time')    ?? ''
  const patient = searchParams.get('patient') ?? ''
  const clinicName = searchParams.get('clinic') ?? ''

  if (!code) {
    return (
      <div className="min-h-screen bg-[#F0F9FF] flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-gray-500">Data konfirmasi tidak ditemukan.</p>
          <Link href={`/booking/${slug}`} className="mt-4 inline-block text-primary font-bold">Booking Ulang</Link>
        </div>
      </div>
    )
  }

  function handleCopy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    })
  }

  // Google Calendar URL
  const gcStart = date.replace(/-/g, '') + 'T' + time.replace(':', '') + '00'
  const gcEnd   = date.replace(/-/g, '') + 'T' + (() => {
    const [h, m] = time.split(':').map(Number)
    const endMin = m + 30; const endH = h + Math.floor(endMin / 60)
    return `${String(endH).padStart(2, '0')}${String(endMin % 60).padStart(2, '0')}00`
  })()
  const gcUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`Appointment di ${clinicName}`)}&dates=${gcStart}/${gcEnd}&details=${encodeURIComponent(`Kode Booking: ${code}\nDokter: dr. ${doctor}\nKlinik: ${clinicName}`)}`

  return (
    <div className="min-h-screen bg-[#F0F9FF]">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-5 py-4">
        <p className="font-black text-primary text-center">{clinicName}</p>
      </header>

      <div className="px-5 pt-8 pb-12 max-w-md mx-auto">
        {/* Success icon */}
        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={40} className="text-emerald-600" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 mb-1">Booking Berhasil!</h1>
          <p className="text-gray-500 text-sm">Kode booking Anda telah dibuat</p>
        </div>

        {/* Booking code */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-5 text-center">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Kode Booking</p>
          <p className="text-4xl font-black text-primary tracking-wider mb-4">{code}</p>
          <button onClick={handleCopy}
            className="flex items-center gap-2 mx-auto px-5 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-bold text-gray-700 transition-colors">
            {copied ? <><CheckCircle size={14} className="text-emerald-500" /> Tersalin!</> : <><Copy size={14} /> Salin Kode</>}
          </button>
        </div>

        {/* Info box */}
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 mb-5">
          <p className="text-sm font-bold text-primary flex items-start gap-2">
            <span className="text-base flex-shrink-0">📋</span>
            Tunjukkan kode ini kepada receptionist saat Anda tiba di klinik.
          </p>
        </div>

        {/* Detail */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5 space-y-3">
          {[
            ['Pasien',   patient],
            ['Dokter',   `dr. ${doctor}`],
            ['Tanggal',  fmtDate(date)],
            ['Jam',      `${time} WIB`],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center gap-3">
              <p className="text-sm text-gray-500 w-20 flex-shrink-0">{label}</p>
              <p className="text-sm font-bold text-gray-900">{value}</p>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <a href={gcUrl} target="_blank" rel="noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3.5 border-2 border-gray-200 bg-white rounded-2xl text-sm font-bold text-gray-700 hover:border-gray-300 transition-colors">
            <Calendar size={16} /> Tambah ke Google Calendar
          </a>
          <Link href={`/booking/${slug}`}
            className="flex items-center justify-center gap-2 w-full py-3.5 bg-primary text-white rounded-2xl text-sm font-bold hover:bg-primary-hover transition-colors">
            <RefreshCw size={16} /> Booking Lagi
          </Link>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Konfirmasi WhatsApp telah dikirim ke nomor Anda.<br />Harap hadir 10 menit sebelum jadwal.
        </p>
      </div>
    </div>
  )
}

export default function ConfirmationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F0F9FF] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ConfirmationContent />
    </Suspense>
  )
}
