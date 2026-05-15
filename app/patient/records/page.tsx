'use client'

import { useState } from 'react'
import TopBar from '@/components/TopBar'
import { ChevronDown, ChevronUp } from 'lucide-react'

const RECORDS = [
  {
    id: 1, date: '12 Mei 2026', doctor: 'Dr. Sarah Putri',  diagnosis: 'Pemeriksaan Rutin',
    notes: 'Kondisi pasien baik, tekanan darah normal, tidak ada keluhan berarti.',
    vitals: { bloodPressure: '120/80', temperature: '36.5', heartRate: '72' },
    medications: [
      { name: 'Vitamin C',    dosage: '500mg',   duration: '30 hari' },
      { name: 'Multivitamin', dosage: '1 tablet',duration: '30 hari' },
    ],
  },
  {
    id: 2, date: '25 Apr 2026', doctor: 'Dr. Sarah Putri',  diagnosis: 'Flu & Batuk',
    notes: 'Pasien mengalami batuk dan pilek sejak 3 hari. Demam ringan.',
    vitals: { bloodPressure: '118/78', temperature: '37.2', heartRate: '78' },
    medications: [
      { name: 'Paracetamol', dosage: '500mg',      duration: '5 hari' },
      { name: 'Obat Batuk',  dosage: '3x sehari',  duration: '7 hari' },
    ],
  },
  {
    id: 3, date: '10 Apr 2026', doctor: 'Dr. Budi Santoso', diagnosis: 'Kontrol Tekanan Darah',
    notes: 'Tekanan darah terkontrol dengan baik, lanjutkan pengobatan.',
    vitals: { bloodPressure: '125/82', temperature: '36.6', heartRate: '70' },
    medications: [
      { name: 'Amlodipine', dosage: '5mg', duration: 'Rutin' },
    ],
  },
]

export default function PatientRecordsPage() {
  const [expanded, setExpanded] = useState<number | null>(null)

  return (
    <div className="min-h-screen bg-background">
      <TopBar title="Rekam Medis" subtitle="Riwayat kesehatan Anda" showSearch={false} />

      <div className="p-8 max-w-3xl mx-auto">

        {/* Patient info */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-7">
          <h3 className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-4">
            Informasi Pasien
          </h3>
          <div className="grid grid-cols-4 gap-6">
            {[
              { label: 'No. Rekam Medis', value: 'RM-2024-005',    cls: ''                 },
              { label: 'Golongan Darah',  value: 'O+',              cls: 'text-destructive' },
              { label: 'Tinggi / Berat',  value: '172 cm / 68 kg', cls: ''                 },
              { label: 'Alergi',          value: 'Tidak ada',       cls: ''                 },
            ].map(row => (
              <div key={row.label}>
                <p className="text-xs text-muted-foreground mb-1">{row.label}</p>
                <p className={`text-sm font-bold text-secondary ${row.cls}`}>{row.value}</p>
              </div>
            ))}
          </div>
        </div>

        <h2 className="text-lg font-black text-secondary mb-5">Timeline Kunjungan</h2>

        {/* Timeline */}
        <div className="relative">
          <div className="absolute left-7 top-0 bottom-0 w-0.5 bg-gray-200" />

          <div className="space-y-5">
            {RECORDS.map(rec => {
              const open = expanded === rec.id
              const day  = rec.date.split(' ')[0]

              return (
                <div key={rec.id} className="relative pl-16">
                  {/* Date node */}
                  <div className="absolute left-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white font-black text-base border-4 border-[#F0F9FF]">
                    {day}
                  </div>

                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    {/* Header */}
                    <div
                      onClick={() => setExpanded(open ? null : rec.id)}
                      className="p-5 cursor-pointer hover:bg-gray-50 transition-colors flex items-start justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-base font-black text-secondary">{rec.diagnosis}</h3>
                          <span className="text-xs text-muted-foreground font-semibold">{rec.date}</span>
                        </div>
                        <p className="text-sm text-muted-foreground font-semibold">{rec.doctor}</p>
                      </div>
                      <button className="p-2 hover:bg-gray-100 rounded-xl transition-colors flex-shrink-0">
                        {open ? <ChevronUp size={18} className="text-secondary" /> : <ChevronDown size={18} className="text-secondary" />}
                      </button>
                    </div>

                    {/* Expanded */}
                    {open && (
                      <div className="px-5 pb-6 border-t border-gray-100 pt-5">
                        {/* Vitals */}
                        <div className="grid grid-cols-3 gap-5 mb-5">
                          {[
                            { label: 'Tekanan Darah', value: rec.vitals.bloodPressure, unit: 'mmHg' },
                            { label: 'Suhu',           value: rec.vitals.temperature,  unit: '°C'   },
                            { label: 'Detak Jantung',  value: rec.vitals.heartRate,    unit: 'bpm'  },
                          ].map(v => (
                            <div key={v.label}>
                              <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-1">{v.label}</p>
                              <p className="text-2xl font-black text-secondary tabular-nums">{v.value}</p>
                              <p className="text-xs text-muted-foreground">{v.unit}</p>
                            </div>
                          ))}
                        </div>

                        {/* Notes */}
                        <div className="mb-5">
                          <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-2">Catatan Dokter</p>
                          <p className="text-sm text-secondary leading-relaxed">{rec.notes}</p>
                        </div>

                        {/* Medications */}
                        <div>
                          <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-3">Resep Obat</p>
                          <div className="space-y-2">
                            {rec.medications.map((med, i) => (
                              <div key={i} className="flex items-center gap-3 p-3 bg-primary/5 rounded-xl">
                                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 text-base">
                                  💊
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-secondary">{med.name}</p>
                                  <p className="text-xs text-muted-foreground">{med.dosage} · {med.duration}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
