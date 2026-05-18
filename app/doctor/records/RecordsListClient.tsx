'use client'

import { useState } from 'react'
import { Eye, X, Loader2 } from 'lucide-react'

type ListRecord = {
  id: string
  created_at: string
  chief_complaint: string | null
  soap_assessment: string | null
  icd10_codes: string[] | null
  patients: { full_name: string; no_rm: string } | null
  doctors:  { full_name: string } | null
}

type DetailRecord = ListRecord & {
  soap_subjective: string | null
  soap_objective:  string | null
  soap_plan:       string | null
  allergy_notes:   string | null
  follow_up_date:  string | null
  referral:        string | null
  blood_pressure_sys: number | null
  blood_pressure_dia: number | null
  temperature:     number | null
  weight:          number | null
  height:          number | null
  heart_rate:      number | null
  diagnoses:       string[]
  treatment:       string | null
  notes:           string | null
  prescriptions: {
    medication_name: string; dosage: string; frequency: string
    duration: string; route: string | null; instructions: string | null
  }[]
}

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso))
}

function truncate(s: string | null | undefined, n = 50) {
  if (!s) return '—'
  return s.length > n ? s.slice(0, n) + '…' : s
}

function SoapSection({ title, content }: { title: string; content: string | null }) {
  if (!content) return null
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-1">{title}</p>
      <p className="text-sm text-secondary leading-relaxed whitespace-pre-wrap">{content}</p>
    </div>
  )
}

export default function RecordsListClient({ records }: { records: ListRecord[] }) {
  const [detail, setDetail]   = useState<DetailRecord | null>(null)
  const [loading, setLoading] = useState<string | null>(null)

  async function openDetail(id: string) {
    setLoading(id)
    try {
      const res  = await fetch(`/api/doctor/records?record_id=${id}`)
      const data = await res.json() as { record?: DetailRecord }
      if (data.record) setDetail(data.record)
    } finally {
      setLoading(null)
    }
  }

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left text-[10px] uppercase tracking-widest font-bold text-muted-foreground px-5 py-3">Tanggal</th>
                <th className="text-left text-[10px] uppercase tracking-widest font-bold text-muted-foreground px-3 py-3">Pasien</th>
                <th className="text-left text-[10px] uppercase tracking-widest font-bold text-muted-foreground px-3 py-3 hidden md:table-cell">Dokter</th>
                <th className="text-left text-[10px] uppercase tracking-widest font-bold text-muted-foreground px-3 py-3">Diagnosis</th>
                <th className="text-left text-[10px] uppercase tracking-widest font-bold text-muted-foreground px-3 py-3 hidden lg:table-cell">ICD-10</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {records.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-sm text-muted-foreground">Belum ada rekam medis</td>
                </tr>
              ) : records.map(r => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 text-xs text-muted-foreground whitespace-nowrap">{fmtDate(r.created_at)}</td>
                  <td className="px-3 py-3">
                    <p className="font-bold text-secondary text-sm">{(r.patients as { full_name: string } | null)?.full_name ?? '—'}</p>
                    <p className="text-xs text-muted-foreground">{(r.patients as { no_rm: string } | null)?.no_rm ?? ''}</p>
                  </td>
                  <td className="px-3 py-3 text-xs text-muted-foreground hidden md:table-cell">
                    {(r.doctors as { full_name: string } | null)?.full_name ?? '—'}
                  </td>
                  <td className="px-3 py-3 text-sm text-secondary max-w-[200px]">
                    {truncate(r.soap_assessment ?? r.chief_complaint)}
                  </td>
                  <td className="px-3 py-3 hidden lg:table-cell">
                    {r.icd10_codes && r.icd10_codes.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {r.icd10_codes.slice(0, 3).map(code => (
                          <span key={code} className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-[10px] font-bold">
                            {code}
                          </span>
                        ))}
                        {r.icd10_codes.length > 3 && (
                          <span className="text-[10px] text-muted-foreground">+{r.icd10_codes.length - 3}</span>
                        )}
                      </div>
                    ) : <span className="text-muted-foreground text-xs">—</span>}
                  </td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => openDetail(r.id)}
                      disabled={loading === r.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-primary border border-primary/20 rounded-xl hover:bg-primary/5 transition-colors disabled:opacity-50"
                    >
                      {loading === r.id ? <Loader2 size={12} className="animate-spin" /> : <Eye size={12} />}
                      Lihat Detail
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail modal */}
      {detail && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center p-4 overflow-y-auto" onClick={() => setDetail(null)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl my-8" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-7 py-5 border-b border-gray-100">
              <div>
                <h3 className="text-base font-black text-secondary">
                  {(detail.patients as { full_name: string } | null)?.full_name ?? 'Rekam Medis'}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {(detail.patients as { no_rm: string } | null)?.no_rm} · {fmtDate(detail.created_at)}
                  {(detail.doctors as { full_name: string } | null)?.full_name ? ` · dr. ${(detail.doctors as { full_name: string }).full_name}` : ''}
                </p>
              </div>
              <button onClick={() => setDetail(null)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                <X size={18} className="text-secondary" />
              </button>
            </div>

            <div className="px-7 py-6 space-y-6">
              {/* Vitals */}
              {(detail.blood_pressure_sys || detail.temperature || detail.heart_rate) && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-3">Vital Signs</p>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                    {detail.blood_pressure_sys && (
                      <div className="bg-gray-50 rounded-xl p-3 text-center">
                        <p className="text-xs font-black text-secondary">{detail.blood_pressure_sys}/{detail.blood_pressure_dia}</p>
                        <p className="text-[10px] text-muted-foreground">mmHg</p>
                      </div>
                    )}
                    {detail.temperature && (
                      <div className="bg-gray-50 rounded-xl p-3 text-center">
                        <p className="text-xs font-black text-secondary">{detail.temperature}°C</p>
                        <p className="text-[10px] text-muted-foreground">Suhu</p>
                      </div>
                    )}
                    {detail.heart_rate && (
                      <div className="bg-gray-50 rounded-xl p-3 text-center">
                        <p className="text-xs font-black text-secondary">{detail.heart_rate}</p>
                        <p className="text-[10px] text-muted-foreground">bpm</p>
                      </div>
                    )}
                    {detail.weight && (
                      <div className="bg-gray-50 rounded-xl p-3 text-center">
                        <p className="text-xs font-black text-secondary">{detail.weight} kg</p>
                        <p className="text-[10px] text-muted-foreground">Berat</p>
                      </div>
                    )}
                    {detail.height && (
                      <div className="bg-gray-50 rounded-xl p-3 text-center">
                        <p className="text-xs font-black text-secondary">{detail.height} cm</p>
                        <p className="text-[10px] text-muted-foreground">Tinggi</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SOAP */}
              <div className="space-y-4">
                {detail.chief_complaint && <SoapSection title="S — Keluhan Utama" content={detail.chief_complaint} />}
                <SoapSection title="S — Anamnesis" content={detail.soap_subjective} />
                {detail.allergy_notes && <SoapSection title="S — Catatan Alergi" content={detail.allergy_notes} />}
                <SoapSection title="O — Pemeriksaan Fisik" content={detail.soap_objective} />
                <SoapSection title="A — Diagnosis" content={detail.soap_assessment} />
                {detail.icd10_codes && detail.icd10_codes.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-2">A — Kode ICD-10</p>
                    <div className="flex flex-wrap gap-2">
                      {detail.icd10_codes.map(code => (
                        <span key={code} className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold">{code}</span>
                      ))}
                    </div>
                  </div>
                )}
                <SoapSection title="P — Rencana Terapi" content={detail.soap_plan} />
                {detail.follow_up_date && (
                  <div>
                    <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-1">Kontrol Ulang</p>
                    <p className="text-sm text-secondary font-bold">{fmtDate(detail.follow_up_date)}</p>
                  </div>
                )}
                {detail.referral && <SoapSection title="Rujukan" content={detail.referral} />}
              </div>

              {/* Prescriptions */}
              {detail.prescriptions && detail.prescriptions.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-3">Resep Obat</p>
                  <div className="space-y-2">
                    {detail.prescriptions.map((med, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-primary/5 rounded-xl">
                        <span className="text-base mt-0.5">💊</span>
                        <div>
                          <p className="text-sm font-bold text-secondary">{med.medication_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {[med.dosage, med.frequency, med.duration, med.route].filter(Boolean).join(' · ')}
                          </p>
                          {med.instructions && <p className="text-xs text-muted-foreground mt-0.5 italic">{med.instructions}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
