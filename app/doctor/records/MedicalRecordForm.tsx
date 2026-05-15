'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import TopBar from '@/components/TopBar'
import { Plus, X, CheckCircle, AlertTriangle } from 'lucide-react'

const INPUT_CLS = 'w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all'
const LABEL_CLS = 'text-[10px] uppercase tracking-widest font-bold text-muted-foreground block mb-2'

type Patient = {
  id: string; no_rm: string; full_name: string; date_of_birth: string|null
  gender: string|null; blood_type: string|null; allergies: string|null; weight: number|null; height: number|null
}
type HistoryItem = {
  id: string; diagnoses: string[]; notes: string|null; created_at: string
  doctors: { full_name: string } | null
}

function calcAge(dob: string|null) {
  if (!dob) return '—'
  return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 86400000)) + ' tahun'
}
function avatarGrad(name: string) {
  const c = ['from-cyan-400 to-blue-500','from-violet-400 to-purple-600','from-emerald-400 to-teal-600']
  return c[(name ?? '').split('').reduce((a,x) => a+x.charCodeAt(0),0) % c.length]
}

export default function MedicalRecordForm({ appointment, patient, history }: {
  appointment: { id: string; complaint: string|null }
  patient: Patient
  history: HistoryItem[]
}) {
  const router = useRouter()
  const [pending, startTrans] = useTransition()

  const [bpSys,     setBpSys]     = useState('')
  const [bpDia,     setBpDia]     = useState('')
  const [temp,      setTemp]      = useState('')
  const [weight,    setWeight]    = useState(patient.weight ? String(patient.weight) : '')
  const [heartRate, setHeartRate] = useState('')
  const [complaint, setComplaint] = useState(appointment.complaint ?? '')
  const [diagnoses, setDiagnoses] = useState([''])
  const [treatment, setTreatment] = useState('')
  const [notes,     setNotes]     = useState('')
  const [meds, setMeds]           = useState([{ medication_name:'', dosage:'', frequency:'', duration:'' }])
  const [saved, setSaved]         = useState(false)
  const [error, setError]         = useState('')

  const addDiagnosis    = () => setDiagnoses(d => [...d, ''])
  const removeDiagnosis = (i: number) => setDiagnoses(d => d.filter((_,idx) => idx !== i))
  const updateDiagnosis = (i: number, v: string) => setDiagnoses(d => d.map((x,idx) => idx === i ? v : x))

  const addMed    = () => setMeds(m => [...m, { medication_name:'', dosage:'', frequency:'', duration:'' }])
  const removeMed = (i: number) => setMeds(m => m.filter((_,idx) => idx !== i))
  const updateMed = (i: number, field: string, v: string) => setMeds(m => m.map((x,idx) => idx === i ? { ...x, [field]: v } : x))

  async function handleSave(complete: boolean) {
    setError('')
    startTrans(async () => {
      const res = await fetch('/api/doctor/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointment_id   : appointment.id,
          patient_id       : patient.id,
          blood_pressure_sys: bpSys ? parseInt(bpSys) : null,
          blood_pressure_dia: bpDia ? parseInt(bpDia) : null,
          temperature      : temp ? parseFloat(temp) : null,
          weight           : weight ? parseFloat(weight) : null,
          heart_rate       : heartRate ? parseInt(heartRate) : null,
          chief_complaint  : complaint || null,
          diagnoses        : diagnoses.filter(d => d.trim()),
          treatment        : treatment || null,
          notes            : notes || null,
          medications      : meds.filter(m => m.medication_name.trim()),
          complete,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setSaved(true)
        if (complete) setTimeout(() => router.push('/doctor'), 1200)
      } else {
        setError(data.error ?? 'Gagal menyimpan rekam medis')
      }
    })
  }

  return (
    <div className="min-h-screen bg-background">
      <TopBar title="Input Rekam Medis" subtitle="Dokumentasi pemeriksaan pasien" showSearch={false} />

      {saved && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl font-bold text-sm">
          <CheckCircle size={18} /> Rekam medis berhasil disimpan!
        </div>
      )}

      <div className="p-8">
        <div className="grid grid-cols-3 gap-6">

          {/* Left: form */}
          <div className="col-span-2 space-y-5">
            {error && (
              <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
                <AlertTriangle size={16} className="text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-600 font-medium">{error}</p>
              </div>
            )}

            {/* Vital Signs */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <h3 className={LABEL_CLS}>Vital Signs</h3>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className={LABEL_CLS}>Tekanan Darah</label>
                  <div className="flex items-center gap-2">
                    <input type="number" value={bpSys} onChange={e => setBpSys(e.target.value)}
                      placeholder="120" className={`${INPUT_CLS} text-center font-black tabular-nums`} />
                    <span className="text-lg font-black text-muted-foreground">/</span>
                    <input type="number" value={bpDia} onChange={e => setBpDia(e.target.value)}
                      placeholder="80" className={`${INPUT_CLS} text-center font-black tabular-nums`} />
                  </div>
                  <span className="text-xs text-muted-foreground mt-1 block">mmHg</span>
                </div>
                <div>
                  <label className={LABEL_CLS}>Suhu Tubuh</label>
                  <input type="number" step="0.1" value={temp} onChange={e => setTemp(e.target.value)}
                    placeholder="36.5" className={`${INPUT_CLS} text-center font-black tabular-nums`} />
                  <span className="text-xs text-muted-foreground mt-1 block">°C</span>
                </div>
                <div>
                  <label className={LABEL_CLS}>Berat Badan</label>
                  <input type="number" step="0.1" value={weight} onChange={e => setWeight(e.target.value)}
                    placeholder="68" className={`${INPUT_CLS} text-center font-black tabular-nums`} />
                  <span className="text-xs text-muted-foreground mt-1 block">kg</span>
                </div>
                <div>
                  <label className={LABEL_CLS}>Detak Jantung</label>
                  <input type="number" value={heartRate} onChange={e => setHeartRate(e.target.value)}
                    placeholder="72" className={`${INPUT_CLS} text-center font-black tabular-nums`} />
                  <span className="text-xs text-muted-foreground mt-1 block">bpm</span>
                </div>
              </div>
            </div>

            {/* Keluhan */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <label className={LABEL_CLS}>Keluhan Utama</label>
              <textarea rows={3} value={complaint} onChange={e => setComplaint(e.target.value)}
                placeholder="Tulis keluhan utama pasien..." className={`${INPUT_CLS} resize-none`} />
            </div>

            {/* Diagnosis */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className={LABEL_CLS}>Diagnosis</h3>
                <button onClick={addDiagnosis} className="flex items-center gap-1.5 px-3 py-2 bg-primary/10 text-primary rounded-xl hover:bg-primary/20 transition-colors font-bold text-sm">
                  <Plus size={14} /> Tambah
                </button>
              </div>
              <div className="space-y-2">
                {diagnoses.map((d, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input type="text" value={d} onChange={e => updateDiagnosis(i, e.target.value)}
                      placeholder="Tulis diagnosis..." className={INPUT_CLS} />
                    {diagnoses.length > 1 && (
                      <button onClick={() => removeDiagnosis(i)} className="p-2 text-destructive hover:bg-destructive/10 rounded-xl flex-shrink-0">
                        <X size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Tatalaksana */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <label className={LABEL_CLS}>Tatalaksana / Terapi</label>
              <textarea rows={2} value={treatment} onChange={e => setTreatment(e.target.value)}
                placeholder="Prosedur atau terapi yang diberikan..." className={`${INPUT_CLS} resize-none`} />
            </div>

            {/* Resep */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className={LABEL_CLS}>Resep Obat</h3>
                <button onClick={addMed} className="flex items-center gap-1.5 px-3 py-2 bg-primary/10 text-primary rounded-xl hover:bg-primary/20 transition-colors font-bold text-sm">
                  <Plus size={14} /> Tambah Obat
                </button>
              </div>
              <div className="space-y-3">
                {meds.map((m, i) => (
                  <div key={i} className="grid grid-cols-4 gap-2 items-center">
                    <input type="text" value={m.medication_name} onChange={e => updateMed(i, 'medication_name', e.target.value)}
                      placeholder="Nama obat" className={INPUT_CLS} />
                    <input type="text" value={m.dosage} onChange={e => updateMed(i, 'dosage', e.target.value)}
                      placeholder="Dosis (mis: 500mg)" className={INPUT_CLS} />
                    <input type="text" value={m.frequency} onChange={e => updateMed(i, 'frequency', e.target.value)}
                      placeholder="Frekuensi (mis: 3×/hari)" className={INPUT_CLS} />
                    <div className="flex gap-2">
                      <input type="text" value={m.duration} onChange={e => updateMed(i, 'duration', e.target.value)}
                        placeholder="Durasi (mis: 5 hari)" className={`${INPUT_CLS} flex-1`} />
                      {meds.length > 1 && (
                        <button onClick={() => removeMed(i)} className="p-2 text-destructive hover:bg-destructive/10 rounded-xl flex-shrink-0">
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Catatan */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <label className={LABEL_CLS}>Catatan Dokter</label>
              <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Catatan tambahan, kontrol ulang, atau rujukan..." className={`${INPUT_CLS} resize-none`} />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pb-8">
              <button onClick={() => handleSave(false)} disabled={pending}
                className="flex-1 py-3.5 bg-white border border-gray-200 text-secondary rounded-xl hover:bg-gray-50 transition-colors font-bold text-sm disabled:opacity-50">
                {pending ? 'Menyimpan...' : 'Simpan Draft'}
              </button>
              <button onClick={() => handleSave(true)} disabled={pending}
                className="flex-1 py-3.5 bg-primary text-white rounded-xl hover:bg-primary-hover transition-colors font-bold text-sm shadow-sm disabled:opacity-50">
                {pending ? 'Menyimpan...' : 'Simpan & Selesai'}
              </button>
            </div>
          </div>

          {/* Right: patient card */}
          <div>
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm sticky top-6">
              <div className="flex items-center gap-4 mb-5 pb-5 border-b border-gray-100">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${avatarGrad(patient.full_name)} flex items-center justify-center text-white font-black text-lg flex-shrink-0`}>
                  {patient.full_name.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-black text-secondary">{patient.full_name}</h3>
                  <p className="text-sm text-muted-foreground font-semibold">{patient.no_rm}</p>
                </div>
              </div>

              <div className="space-y-4 mb-5">
                {[
                  { label: 'Usia',           value: calcAge(patient.date_of_birth) },
                  { label: 'Jenis Kelamin',  value: patient.gender === 'male' ? 'Laki-laki' : patient.gender === 'female' ? 'Perempuan' : '—' },
                  { label: 'Golongan Darah', value: patient.blood_type ?? '—', cls: 'text-destructive' },
                  { label: 'Berat / Tinggi', value: `${patient.weight ?? '—'} kg / ${patient.height ?? '—'} cm` },
                ].map(row => (
                  <div key={row.label}>
                    <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-0.5">{row.label}</p>
                    <p className={`text-sm font-bold ${(row as any).cls ?? 'text-secondary'}`}>{row.value}</p>
                  </div>
                ))}
                {patient.allergies && (
                  <div>
                    <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-1">Alergi</p>
                    <span className="px-2.5 py-1 bg-destructive/10 text-destructive rounded-full text-xs font-bold">{patient.allergies}</span>
                  </div>
                )}
              </div>

              {history.length > 0 && (
                <div className="border-t border-gray-100 pt-5">
                  <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-3">Riwayat Kunjungan</p>
                  <div className="space-y-3">
                    {history.map(v => (
                      <div key={v.id} className="flex items-start gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                        <div>
                          <p className="text-xs font-bold text-secondary">{v.diagnoses?.[0] ?? 'Kunjungan'}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {new Date(v.created_at).toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric' })}
                            {(v.doctors as any)?.full_name ? ` · ${(v.doctors as any).full_name}` : ''}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
