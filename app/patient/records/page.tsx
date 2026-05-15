'use client'

import { useState, useEffect } from 'react'
import TopBar from '@/components/TopBar'
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react'

type Prescription = { medication_name: string; dosage: string; frequency: string; duration: string }
type Record = {
  id: string; created_at: string; diagnoses: string[]; notes: string|null; treatment: string|null
  blood_pressure_sys: number|null; blood_pressure_dia: number|null; temperature: number|null; heart_rate: number|null
  doctors: { full_name: string } | null
  prescriptions: Prescription[]
}
type Patient = { no_rm: string; blood_type: string|null; allergies: string|null; weight: number|null; height: number|null }

export default function PatientRecordsPage() {
  const [records,  setRecords]  = useState<Record[]>([])
  const [patient,  setPatient]  = useState<Patient | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/patient/records')
      .then(r => r.json())
      .then(d => { setRecords(d.records ?? []); setPatient(d.patient ?? null); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <TopBar title="Rekam Medis" subtitle="Riwayat kesehatan Anda" showSearch={false} />

      <div className="p-8 max-w-3xl mx-auto">

        {/* Patient info */}
        {patient && (
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-7">
            <h3 className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-4">Informasi Pasien</h3>
            <div className="grid grid-cols-4 gap-6">
              {[
                { label: 'No. Rekam Medis', value: patient.no_rm,                         cls: '' },
                { label: 'Golongan Darah',  value: patient.blood_type ?? '—',              cls: 'text-destructive' },
                { label: 'Tinggi / Berat',  value: `${patient.height ?? '—'} cm / ${patient.weight ?? '—'} kg`, cls: '' },
                { label: 'Alergi',          value: patient.allergies ?? 'Tidak ada',       cls: '' },
              ].map(row => (
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
            <h2 className="text-lg font-black text-secondary mb-5">Timeline Kunjungan</h2>
            <div className="relative">
              <div className="absolute left-7 top-0 bottom-0 w-0.5 bg-gray-200" />
              <div className="space-y-5">
                {records.map(rec => {
                  const open = expanded === rec.id
                  const date = new Date(rec.created_at)
                  const day  = date.getDate()
                  const fullDate = date.toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' })

                  return (
                    <div key={rec.id} className="relative pl-16">
                      <div className="absolute left-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white font-black text-base border-4 border-[#F0F9FF]">
                        {day}
                      </div>

                      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div onClick={() => setExpanded(open ? null : rec.id)}
                          className="p-5 cursor-pointer hover:bg-gray-50 transition-colors flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-3 mb-1">
                              <h3 className="text-base font-black text-secondary">
                                {rec.diagnoses?.length > 0 ? rec.diagnoses[0] : 'Kunjungan'}
                              </h3>
                              <span className="text-xs text-muted-foreground font-semibold">{fullDate}</span>
                            </div>
                            <p className="text-sm text-muted-foreground font-semibold">
                              {(rec.doctors as any)?.full_name ?? '—'}
                            </p>
                          </div>
                          <button className="p-2 hover:bg-gray-100 rounded-xl transition-colors flex-shrink-0">
                            {open ? <ChevronUp size={18} className="text-secondary" /> : <ChevronDown size={18} className="text-secondary" />}
                          </button>
                        </div>

                        {open && (
                          <div className="px-5 pb-6 border-t border-gray-100 pt-5">
                            {/* Vitals */}
                            <div className="grid grid-cols-3 gap-5 mb-5">
                              {[
                                { label: 'Tekanan Darah', value: rec.blood_pressure_sys && rec.blood_pressure_dia ? `${rec.blood_pressure_sys}/${rec.blood_pressure_dia}` : '—', unit: 'mmHg' },
                                { label: 'Suhu', value: rec.temperature ? String(rec.temperature) : '—', unit: '°C' },
                                { label: 'Detak Jantung', value: rec.heart_rate ? String(rec.heart_rate) : '—', unit: 'bpm' },
                              ].map(v => (
                                <div key={v.label}>
                                  <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-1">{v.label}</p>
                                  <p className="text-2xl font-black text-secondary tabular-nums">{v.value}</p>
                                  <p className="text-xs text-muted-foreground">{v.unit}</p>
                                </div>
                              ))}
                            </div>

                            {/* Diagnoses */}
                            {rec.diagnoses?.length > 1 && (
                              <div className="mb-4">
                                <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-2">Semua Diagnosis</p>
                                <div className="flex flex-wrap gap-2">
                                  {rec.diagnoses.map((d, i) => (
                                    <span key={i} className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold">{d}</span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {rec.treatment && (
                              <div className="mb-5">
                                <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-2">Tatalaksana</p>
                                <p className="text-sm text-secondary leading-relaxed">{rec.treatment}</p>
                              </div>
                            )}

                            {rec.notes && (
                              <div className="mb-5">
                                <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-2">Catatan Dokter</p>
                                <p className="text-sm text-secondary leading-relaxed">{rec.notes}</p>
                              </div>
                            )}

                            {rec.prescriptions?.length > 0 && (
                              <div>
                                <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-3">Resep Obat</p>
                                <div className="space-y-2">
                                  {rec.prescriptions.map((med, i) => (
                                    <div key={i} className="flex items-center gap-3 p-3 bg-primary/5 rounded-xl">
                                      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 text-base">💊</div>
                                      <div>
                                        <p className="text-sm font-bold text-secondary">{med.medication_name}</p>
                                        <p className="text-xs text-muted-foreground">{med.dosage} · {med.frequency} · {med.duration}</p>
                                      </div>
                                    </div>
                                  ))}
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
