'use client'

import { useState, useEffect } from 'react'
import TopBar from '@/components/TopBar'
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react'

type Prescription = {
  medication_name: string; dosage: string; frequency: string
  duration: string; route: string | null; instructions: string | null
}
type MedRecord = {
  id: string; created_at: string
  chief_complaint: string | null
  soap_assessment: string | null
  diagnoses: string[]
  follow_up_date: string | null
  treatment: string | null
  notes: string | null
  blood_pressure_sys: number | null; blood_pressure_dia: number | null
  temperature: number | null; heart_rate: number | null
  doctors: { full_name: string } | null
  prescriptions: Prescription[]
}
type Patient = { no_rm: string; blood_type: string | null; allergies: string | null; weight: number | null; height: number | null }

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso))
}

export default function PatientRecordsPage() {
  const [records,  setRecords]  = useState<MedRecord[]>([])
  const [patient,  setPatient]  = useState<Patient | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/patient/records')
      .then(r => r.json())
      .then((d: { records?: MedRecord[]; patient?: Patient }) => {
        setRecords(d.records ?? [])
        setPatient(d.patient ?? null)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <TopBar title="Rekam Medis" subtitle="Riwayat kesehatan Anda" showSearch={false} />

      <div className="p-4 lg:p-8 max-w-3xl mx-auto">

        {/* Patient info */}
        {patient && (
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-7">
            <h3 className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-4">Informasi Pasien</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
              {([
                { label: 'No. Rekam Medis', value: patient.no_rm, cls: '' },
                { label: 'Golongan Darah',  value: patient.blood_type ?? '—', cls: 'text-destructive font-bold' },
                { label: 'Tinggi / Berat',  value: `${patient.height ?? '—'} cm / ${patient.weight ?? '—'} kg`, cls: '' },
                { label: 'Alergi',          value: patient.allergies ?? 'Tidak ada', cls: '' },
              ] as { label: string; value: string; cls: string }[]).map(row => (
                <div key={row.label}>
                  <p className="text-xs text-muted-foreground mb-1">{row.label}</p>
                  <p className={`text-sm font-bold text-secondary ${row.cls}`}>{row.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 size={28} className="animate-spin text-primary" />
          </div>
        ) : records.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center shadow-sm">
            <p className="text-muted-foreground font-semibold text-sm">Belum ada rekam medis</p>
          </div>
        ) : (
          <>
            <h2 className="text-lg font-black text-secondary mb-5">Riwayat Kunjungan</h2>
            <div className="relative">
              <div className="absolute left-7 top-0 bottom-0 w-0.5 bg-gray-200" />
              <div className="space-y-5">
                {records.map(rec => {
                  const open     = expanded === rec.id
                  const date     = new Date(rec.created_at)
                  const day      = date.getDate()
                  const fullDate = fmtDate(rec.created_at)
                  // Patient-friendly diagnosis: prefer soap_assessment, fallback to diagnoses[0]
                  const diagnosis = rec.soap_assessment ?? rec.diagnoses?.[0] ?? 'Kunjungan'

                  return (
                    <div key={rec.id} className="relative pl-16">
                      <div className="absolute left-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white font-black text-base border-4 border-background">
                        {day}
                      </div>

                      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div
                          onClick={() => setExpanded(open ? null : rec.id)}
                          className="p-5 cursor-pointer hover:bg-gray-50 transition-colors flex items-start justify-between"
                        >
                          <div>
                            <div className="flex items-center gap-3 mb-1">
                              <h3 className="text-base font-black text-secondary">{diagnosis}</h3>
                              <span className="text-xs text-muted-foreground font-semibold">{fullDate}</span>
                            </div>
                            <p className="text-sm text-muted-foreground font-semibold">
                              {(rec.doctors as { full_name?: string } | null)?.full_name
                                ? `dr. ${(rec.doctors as { full_name: string }).full_name}`
                                : '—'}
                            </p>
                          </div>
                          <button className="p-2 hover:bg-gray-100 rounded-xl transition-colors flex-shrink-0">
                            {open ? <ChevronUp size={18} className="text-secondary" /> : <ChevronDown size={18} className="text-secondary" />}
                          </button>
                        </div>

                        {open && (
                          <div className="px-5 pb-6 border-t border-gray-100 pt-5 space-y-5">
                            {/* Keluhan */}
                            {rec.chief_complaint && (
                              <div>
                                <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-1">Keluhan</p>
                                <p className="text-sm text-secondary leading-relaxed">{rec.chief_complaint}</p>
                              </div>
                            )}

                            {/* Diagnosis */}
                            {(rec.soap_assessment ?? rec.diagnoses?.[0]) && (
                              <div>
                                <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-1">Diagnosis</p>
                                <p className="text-sm text-secondary leading-relaxed">{rec.soap_assessment ?? rec.diagnoses.join(', ')}</p>
                              </div>
                            )}

                            {/* Vitals — shown in friendly format */}
                            {(rec.blood_pressure_sys || rec.temperature || rec.heart_rate) && (
                              <div className="grid grid-cols-3 gap-3">
                                {rec.blood_pressure_sys && rec.blood_pressure_dia && (
                                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                                    <p className="text-sm font-black text-secondary">{rec.blood_pressure_sys}/{rec.blood_pressure_dia}</p>
                                    <p className="text-[10px] text-muted-foreground">Tekanan Darah</p>
                                  </div>
                                )}
                                {rec.temperature && (
                                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                                    <p className="text-sm font-black text-secondary">{rec.temperature}°C</p>
                                    <p className="text-[10px] text-muted-foreground">Suhu</p>
                                  </div>
                                )}
                                {rec.heart_rate && (
                                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                                    <p className="text-sm font-black text-secondary">{rec.heart_rate} bpm</p>
                                    <p className="text-[10px] text-muted-foreground">Detak Jantung</p>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Resep */}
                            {rec.prescriptions?.length > 0 && (
                              <div>
                                <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-3">Obat yang Diresepkan</p>
                                <div className="space-y-2">
                                  {rec.prescriptions.map((med, i) => (
                                    <div key={i} className="flex items-start gap-3 p-3 bg-primary/5 rounded-xl">
                                      <span className="text-base mt-0.5">💊</span>
                                      <div>
                                        <p className="text-sm font-bold text-secondary">{med.medication_name}</p>
                                        <p className="text-xs text-muted-foreground">
                                          {[med.dosage, med.frequency, med.duration].filter(Boolean).join(' · ')}
                                          {med.route ? ` · ${med.route}` : ''}
                                        </p>
                                        {med.instructions && (
                                          <p className="text-xs text-muted-foreground mt-0.5 italic">{med.instructions}</p>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Kontrol ulang */}
                            {rec.follow_up_date && (
                              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex items-center gap-3">
                                <span className="text-xl">📅</span>
                                <div>
                                  <p className="text-xs font-bold text-amber-700">Jadwal Kontrol Ulang</p>
                                  <p className="text-sm font-black text-amber-800">{fmtDate(rec.follow_up_date)}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
