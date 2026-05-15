'use client'

import { useState } from 'react'
import TopBar from '@/components/TopBar'
import { Star, ChevronLeft, ChevronRight, Calendar, Clock } from 'lucide-react'

const DOCTORS = [
  { id: 1, name: 'Dr. Sarah Putri',  specialty: 'Dokter Umum',                   rating: 4.9, reviews: 127, availableToday: true,  avatar: 'SP' },
  { id: 2, name: 'Dr. Budi Santoso', specialty: 'Spesialis Anak',                 rating: 4.8, reviews: 94,  availableToday: false, avatar: 'BS' },
  { id: 3, name: 'Dr. Ahmad Fauzi',  specialty: 'Spesialis Penyakit Dalam',       rating: 4.7, reviews: 156, availableToday: true,  avatar: 'AF' },
]

const TIME_SLOTS = ['08:00','08:30','09:00','09:30','10:00','10:30','13:00','13:30','14:00','14:30','15:00','15:30']

const STEP_LABELS = ['Pilih Dokter', 'Pilih Jadwal', 'Konfirmasi']

export default function BookingPage() {
  const [step,           setStep]           = useState(1)
  const [selectedDoctor, setSelectedDoctor] = useState<number | null>(null)
  const [selectedDate,   setSelectedDate]   = useState<number | null>(null)
  const [selectedTime,   setSelectedTime]   = useState<string | null>(null)
  const [keluhan,        setKeluhan]        = useState('')

  const dates = Array.from({ length: 7 }, (_, i) => ({
    day:     i + 16,
    dayName: ['Kam','Jum','Sab','Min','Sen','Sel','Rab'][i],
  }))

  const doctor = DOCTORS.find(d => d.id === selectedDoctor)

  const canNext = step === 1 ? !!selectedDoctor
                : step === 2 ? !!(selectedDate && selectedTime)
                : true

  return (
    <div className="min-h-screen bg-background">
      <TopBar title="Buat Appointment" subtitle="Jadwalkan kunjungan Anda" showSearch={false} />

      <div className="p-8 max-w-4xl mx-auto">

        {/* Stepper */}
        <div className="flex items-center justify-center mb-10">
          {[1,2,3].map(s => (
            <div key={s} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className={`w-11 h-11 rounded-full flex items-center justify-center font-black text-sm transition-all ${
                  step >= s ? 'bg-primary text-white' : 'bg-gray-200 text-gray-400'
                }`}>
                  {s}
                </div>
                <span className={`text-[10px] font-bold mt-1.5 ${step >= s ? 'text-primary' : 'text-gray-400'}`}>
                  {STEP_LABELS[s-1]}
                </span>
              </div>
              {s < 3 && <div className={`w-20 h-1 mb-4 mx-2 rounded-full ${step > s ? 'bg-primary' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        {/* Step 1 — Pilih Dokter */}
        {step === 1 && (
          <div>
            <h2 className="text-2xl font-black text-secondary mb-5">Pilih Dokter</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {DOCTORS.map(doc => (
                <div
                  key={doc.id}
                  onClick={() => setSelectedDoctor(doc.id)}
                  className={`bg-white rounded-2xl p-5 border-2 cursor-pointer transition-all ${
                    selectedDoctor === doc.id ? 'border-primary shadow-lg' : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white font-black text-base flex-shrink-0">
                      {doc.avatar}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-black text-secondary mb-0.5">{doc.name}</h3>
                      <p className="text-sm text-muted-foreground font-semibold mb-2">{doc.specialty}</p>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <Star size={14} className="text-warning fill-warning" />
                          <span className="text-sm font-bold text-secondary">{doc.rating}</span>
                          <span className="text-xs text-muted-foreground">({doc.reviews})</span>
                        </div>
                        {doc.availableToday && (
                          <span className="px-2 py-0.5 bg-success/10 text-success rounded-full text-[11px] font-bold">
                            Tersedia hari ini
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 2 — Pilih Jadwal */}
        {step === 2 && (
          <div>
            <h2 className="text-2xl font-black text-secondary mb-5">Pilih Tanggal & Waktu</h2>
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-5">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-black text-secondary">Mei 2026</h3>
                <div className="flex gap-1">
                  <button className="p-2 hover:bg-gray-100 rounded-xl transition-colors"><ChevronLeft size={18} /></button>
                  <button className="p-2 hover:bg-gray-100 rounded-xl transition-colors"><ChevronRight size={18} /></button>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-2 mb-5">
                {dates.map(d => (
                  <button
                    key={d.day}
                    onClick={() => setSelectedDate(d.day)}
                    className={`py-3 rounded-xl border-2 transition-all text-center ${
                      selectedDate === d.day ? 'border-primary bg-primary text-white' : 'border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <p className="text-[10px] font-bold mb-1">{d.dayName}</p>
                    <p className="text-xl font-black">{d.day}</p>
                  </button>
                ))}
              </div>
              {selectedDate && (
                <div>
                  <h3 className="text-sm font-black text-secondary mb-3">Pilih Waktu</h3>
                  <div className="grid grid-cols-6 gap-2">
                    {TIME_SLOTS.map(t => (
                      <button
                        key={t}
                        onClick={() => setSelectedTime(t)}
                        className={`py-2.5 rounded-xl border-2 font-bold text-sm transition-all ${
                          selectedTime === t ? 'border-primary bg-primary text-white' : 'border-gray-100 hover:border-gray-200'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3 — Konfirmasi */}
        {step === 3 && doctor && (
          <div>
            <h2 className="text-2xl font-black text-secondary mb-5">Konfirmasi Appointment</h2>
            <div className="bg-white rounded-2xl p-7 border border-gray-100 shadow-sm mb-5">
              <div className="flex items-center gap-4 pb-5 border-b border-gray-100 mb-5">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white font-black text-lg flex-shrink-0">
                  {doctor.avatar}
                </div>
                <div>
                  <h3 className="text-lg font-black text-secondary">{doctor.name}</h3>
                  <p className="text-sm text-muted-foreground font-semibold">{doctor.specialty}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-5 mb-5">
                <div className="flex items-center gap-3">
                  <Calendar size={18} className="text-primary flex-shrink-0" />
                  <div>
                    <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Tanggal</p>
                    <p className="text-sm font-bold text-secondary">Mei 2026, tanggal {selectedDate}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock size={18} className="text-primary flex-shrink-0" />
                  <div>
                    <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Waktu</p>
                    <p className="text-sm font-bold text-secondary">{selectedTime} WIB</p>
                  </div>
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground block mb-2">
                  Keluhan (opsional)
                </label>
                <textarea
                  value={keluhan}
                  onChange={e => setKeluhan(e.target.value)}
                  rows={3}
                  placeholder="Ceritakan keluhan atau alasan kunjungan Anda..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all resize-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3">
          {step > 1 && (
            <button
              onClick={() => setStep(s => s - 1)}
              className="px-6 py-3 bg-white border border-gray-200 text-secondary rounded-xl hover:bg-gray-50 transition-colors font-bold text-sm"
            >
              ← Kembali
            </button>
          )}
          <button
            onClick={() => step < 3 ? setStep(s => s + 1) : alert('Appointment berhasil dibuat!')}
            disabled={!canNext}
            className="flex-1 py-3 bg-primary text-white rounded-xl hover:bg-primary-hover transition-colors font-bold text-sm shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {step < 3 ? 'Lanjut →' : 'Konfirmasi Appointment'}
          </button>
        </div>
      </div>
    </div>
  )
}
