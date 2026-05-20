'use client'

import { useState, useEffect, useCallback, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import TopBar from '@/components/TopBar'
import { Plus, X, CheckCircle, AlertTriangle, Tag, Clock } from 'lucide-react'
import PrescriptionForm from '@/components/PrescriptionForm'

const INPUT = 'w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all bg-white'
const LABEL = 'text-[10px] uppercase tracking-widest font-bold text-muted-foreground block mb-2'
const TA    = `${INPUT} resize-none`

const ICD10_HINTS = [
  { code: 'J06.9', label: 'ISPA' },       { code: 'K30',   label: 'Dispepsia' },
  { code: 'A09',   label: 'Gastroenteritis' }, { code: 'J00', label: 'Common Cold' },
  { code: 'L30.9', label: 'Dermatitis' },  { code: 'M54.5', label: 'Low back pain' },
  { code: 'I10',   label: 'Hipertensi' },  { code: 'E11',   label: 'DM Tipe 2' },
]

type Tab = 'S' | 'O' | 'A' | 'P'
const TABS: { id: Tab; label: string; desc: string }[] = [
  { id: 'S', label: 'S — Subjektif',  desc: 'Keluhan & anamnesis' },
  { id: 'O', label: 'O — Objektif',   desc: 'Vital signs & pemeriksaan' },
  { id: 'A', label: 'A — Assessment', desc: 'Diagnosis & ICD-10' },
  { id: 'P', label: 'P — Plan',       desc: 'Terapi & resep' },
]

type Med = { medication_name: string; dosage: string; frequency: string; duration: string; route: string; instructions: string }
type Patient = {
  id: string; no_rm: string; full_name: string; date_of_birth: string | null
  gender: string | null; blood_type: string | null; allergies: string | null
  weight: number | null; height: number | null
}
type HistoryItem = {
  id: string; diagnoses: string[]; soap_assessment?: string | null; notes: string | null
  created_at: string; doctors: { full_name: string } | null
}

function calcAge(dob: string | null) {
  if (!dob) return '—'
  return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 86400000)) + ' tahun'
}
function avatarGrad(name: string) {
  const c = ['from-cyan-400 to-blue-500', 'from-violet-400 to-purple-600', 'from-emerald-400 to-teal-600']
  return c[(name ?? '').split('').reduce((a, x) => a + x.charCodeAt(0), 0) % c.length]
}

const DRAFT_KEY = (id: string) => `soap_draft_${id}`

function LetterQuickSection({ patientId, appointmentId, diagnosis }: {
  patientId: string; appointmentId: string; diagnosis: string
}) {
  const [open, setOpen]         = useState(false)
  const [type, setType]         = useState<'sakit' | 'sehat' | 'rujukan' | ''>('')
  const [form, setForm]         = useState({ sick_days: '', sick_from: '', purpose: '', referred_to: '', referral_reason: '' })
  const [submitting, setSubmit] = useState(false)

  async function generate() {
    if (!type) return
    setSubmit(true)
    const body = {
      patient_id: patientId, appointment_id: appointmentId, type, diagnosis: diagnosis || undefined,
      sick_days: form.sick_days ? parseInt(form.sick_days) : undefined,
      sick_from: form.sick_from || undefined,
      sick_until: form.sick_from && form.sick_days
        ? (() => { const d = new Date(form.sick_from); d.setDate(d.getDate() + parseInt(form.sick_days) - 1); return d.toISOString().split('T')[0] })()
        : undefined,
      purpose: form.purpose || undefined,
      referred_to: form.referred_to || undefined,
      referral_reason: form.referral_reason || undefined,
    }
    const res  = await fetch('/api/doctor/medical-letters', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const data = await res.json() as { data?: { id: string } }
    if (data.data?.id) {
      window.open(`/api/admin/medical-letters/${data.data.id}/pdf`, '_blank')
      setOpen(false)
    }
    setSubmit(false)
  }

  return (
    <div className="bg-gray-50 rounded-2xl border border-gray-100 p-5 mb-8">
      <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-3">Surat Keterangan</p>
      {!open ? (
        <div className="flex gap-2">
          {([
            { type: 'sakit',   label: '📋 Surat Sakit' },
            { type: 'sehat',   label: '✅ Surat Sehat' },
            { type: 'rujukan', label: '🏥 Surat Rujukan' },
          ] as const).map(opt => (
            <button key={opt.type} type="button" onClick={() => { setType(opt.type); setOpen(true) }}
              className="flex-1 py-2 text-xs font-bold border-2 border-gray-200 text-gray-600 rounded-xl hover:border-primary hover:text-primary transition-all">
              {opt.label}
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-secondary capitalize">{type === 'sakit' ? '📋 Surat Sakit' : type === 'sehat' ? '✅ Surat Sehat' : '🏥 Surat Rujukan'}</span>
            <button type="button" onClick={() => setOpen(false)}><X size={14} className="text-gray-400" /></button>
          </div>
          {type === 'sakit' && (
            <div className="grid grid-cols-2 gap-2">
              <input type="number" min={1} value={form.sick_days} onChange={e => setForm(f=>({...f, sick_days:e.target.value}))} placeholder="Jumlah hari" className={INPUT} />
              <input type="date" value={form.sick_from} onChange={e => setForm(f=>({...f, sick_from:e.target.value}))} className={INPUT} />
            </div>
          )}
          {type === 'sehat' && (
            <input value={form.purpose} onChange={e => setForm(f=>({...f, purpose:e.target.value}))} placeholder="Keperluan (bekerja, sekolah...)" className={INPUT} />
          )}
          {type === 'rujukan' && (
            <div className="space-y-2">
              <input value={form.referred_to} onChange={e => setForm(f=>({...f, referred_to:e.target.value}))} placeholder="Dirujuk ke (nama RS/klinik)" className={INPUT} />
              <input value={form.referral_reason} onChange={e => setForm(f=>({...f, referral_reason:e.target.value}))} placeholder="Alasan rujukan" className={INPUT} />
            </div>
          )}
          <button type="button" onClick={generate} disabled={submitting}
            className="w-full py-2.5 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary-hover transition-colors disabled:opacity-50">
            {submitting ? 'Membuat...' : 'Generate PDF'}
          </button>
        </div>
      )}
    </div>
  )
}

export default function MedicalRecordForm({ appointment, patient, history, clinicId }: {
  appointment: { id: string; complaint: string | null; status?: string }
  patient: Patient
  history: HistoryItem[]
  clinicId?: string
}) {
  const router = useRouter()
  const [pending, startTrans] = useTransition()
  const [tab, setTab]         = useState<Tab>('S')
  const [saved, setSaved]     = useState(false)
  const [error, setError]     = useState('')
  const [draftSaved, setDraftSaved] = useState(false)

  // S
  const [complaint,      setComplaint]      = useState(appointment.complaint ?? '')
  const [soapSubjective, setSoapSubjective] = useState('')
  const [allergyNotes,   setAllergyNotes]   = useState(patient.allergies ?? '')
  // O
  const [bpSys,     setBpSys]         = useState('')
  const [bpDia,     setBpDia]         = useState('')
  const [temp,      setTemp]          = useState('')
  const [weight,    setWeight]        = useState(patient.weight ? String(patient.weight) : '')
  const [height,    setHeight]        = useState(patient.height ? String(patient.height) : '')
  const [heartRate, setHeartRate]     = useState('')
  const [soapObjective, setSoapObjective] = useState('')
  // A
  const [soapAssessment, setSoapAssessment] = useState('')
  const [icd10Codes, setIcd10Codes]         = useState<string[]>([])
  const [icd10Input, setIcd10Input]         = useState('')
  // P
  const [soapPlan,     setSoapPlan]     = useState('')
  const [followUpDate, setFollowUpDate] = useState('')
  const [referral,     setReferral]     = useState('')
  const [meds, setMeds] = useState<Med[]>([
    { medication_name: '', dosage: '', frequency: '', duration: '', route: '', instructions: '' },
  ])

  // Load draft on mount
  useEffect(() => {
    const raw = localStorage.getItem(DRAFT_KEY(appointment.id))
    if (!raw) return
    try {
      const d = JSON.parse(raw) as Record<string, unknown>
      if (typeof d.complaint      === 'string') setComplaint(d.complaint)
      if (typeof d.soapSubjective === 'string') setSoapSubjective(d.soapSubjective)
      if (typeof d.allergyNotes   === 'string') setAllergyNotes(d.allergyNotes)
      if (typeof d.bpSys          === 'string') setBpSys(d.bpSys)
      if (typeof d.bpDia          === 'string') setBpDia(d.bpDia)
      if (typeof d.temp           === 'string') setTemp(d.temp)
      if (typeof d.weight         === 'string') setWeight(d.weight)
      if (typeof d.height         === 'string') setHeight(d.height)
      if (typeof d.heartRate      === 'string') setHeartRate(d.heartRate)
      if (typeof d.soapObjective  === 'string') setSoapObjective(d.soapObjective)
      if (typeof d.soapAssessment === 'string') setSoapAssessment(d.soapAssessment)
      if (Array.isArray(d.icd10Codes))          setIcd10Codes(d.icd10Codes as string[])
      if (typeof d.soapPlan       === 'string') setSoapPlan(d.soapPlan)
      if (typeof d.followUpDate   === 'string') setFollowUpDate(d.followUpDate)
      if (typeof d.referral       === 'string') setReferral(d.referral)
      if (Array.isArray(d.meds))                setMeds(d.meds as Med[])
    } catch { /* ignore */ }
  }, [appointment.id])

  const getDraft = useCallback(() => ({
    complaint, soapSubjective, allergyNotes,
    bpSys, bpDia, temp, weight, height, heartRate, soapObjective,
    soapAssessment, icd10Codes, soapPlan, followUpDate, referral, meds,
  }), [complaint, soapSubjective, allergyNotes, bpSys, bpDia, temp, weight, height, heartRate, soapObjective, soapAssessment, icd10Codes, soapPlan, followUpDate, referral, meds])

  // Auto-save every 30s
  useEffect(() => {
    const id = setInterval(() => {
      localStorage.setItem(DRAFT_KEY(appointment.id), JSON.stringify(getDraft()))
      setDraftSaved(true)
      setTimeout(() => setDraftSaved(false), 2000)
    }, 30_000)
    return () => clearInterval(id)
  }, [appointment.id, getDraft])

  function saveDraft() {
    localStorage.setItem(DRAFT_KEY(appointment.id), JSON.stringify(getDraft()))
    setDraftSaved(true)
    setTimeout(() => setDraftSaved(false), 2000)
  }

  function addIcd10() {
    const code = icd10Input.trim().toUpperCase()
    if (code && !icd10Codes.includes(code)) { setIcd10Codes(c => [...c, code]); setIcd10Input('') }
  }
  const addMed    = () => setMeds(m => [...m, { medication_name: '', dosage: '', frequency: '', duration: '', route: '', instructions: '' }])
  const removeMed = (i: number) => setMeds(m => m.filter((_, idx) => idx !== i))
  const updateMed = (i: number, field: keyof Med, v: string) =>
    setMeds(m => m.map((x, idx) => idx === i ? { ...x, [field]: v } : x))

  async function handleSave(complete: boolean) {
    setError('')
    startTrans(async () => {
      const res = await fetch('/api/doctor/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointment_id:    appointment.id,
          patient_id:        patient.id,
          blood_pressure_sys: bpSys ? parseInt(bpSys)     : null,
          blood_pressure_dia: bpDia ? parseInt(bpDia)     : null,
          temperature:        temp   ? parseFloat(temp)   : null,
          weight:             weight ? parseFloat(weight) : null,
          height:             height ? parseFloat(height) : null,
          heart_rate:        heartRate ? parseInt(heartRate) : null,
          chief_complaint:   complaint      || null,
          diagnoses:         soapAssessment ? [soapAssessment] : [],
          soap_subjective:   soapSubjective || null,
          soap_objective:    soapObjective  || null,
          soap_assessment:   soapAssessment || null,
          soap_plan:         soapPlan       || null,
          icd10_codes:       icd10Codes,
          allergy_notes:     allergyNotes   || null,
          follow_up_date:    followUpDate   || null,
          referral:          referral       || null,
          medications:       meds.filter(m => m.medication_name.trim()),
          complete,
        }),
      })
      const data = await res.json() as { error?: string }
      if (res.ok) {
        localStorage.removeItem(DRAFT_KEY(appointment.id))
        setSaved(true)
        if (complete) setTimeout(() => router.push('/doctor'), 1200)
      } else {
        setError(data.error ?? 'Gagal menyimpan rekam medis')
      }
    })
  }

  const prevTab = () => { const i = TABS.findIndex(t => t.id === tab); if (i > 0) setTab(TABS[i - 1].id) }
  const nextTab = () => { const i = TABS.findIndex(t => t.id === tab); if (i < TABS.length - 1) setTab(TABS[i + 1].id) }

  return (
    <div className="min-h-screen bg-background">
      <TopBar title="Input Rekam Medis SOAP" subtitle="Dokumentasi pemeriksaan pasien" showSearch={false} />

      {saved && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl font-bold text-sm">
          <CheckCircle size={18} /> Rekam medis berhasil disimpan!
        </div>
      )}
      {draftSaved && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2 bg-gray-700 text-white px-4 py-2 rounded-xl shadow text-xs font-medium">
          <Clock size={13} /> Draft tersimpan
        </div>
      )}

      <div className="p-4 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">

          {/* SOAP form */}
          <div className="lg:col-span-2 space-y-5">
            {error && (
              <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
                <AlertTriangle size={16} className="text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-600 font-medium">{error}</p>
              </div>
            )}

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Tab nav */}
              <div className="grid grid-cols-4 border-b border-gray-100">
                {TABS.map(t => (
                  <button key={t.id} onClick={() => setTab(t.id)}
                    className={`px-3 py-4 text-left transition-all ${tab === t.id ? 'bg-primary/5 border-b-2 border-primary' : 'hover:bg-gray-50'}`}>
                    <p className={`text-xs font-black mb-0.5 ${tab === t.id ? 'text-primary' : 'text-secondary'}`}>{t.label}</p>
                    <p className="text-[10px] text-muted-foreground hidden sm:block">{t.desc}</p>
                  </button>
                ))}
              </div>

              {/* S — Subjektif */}
              {tab === 'S' && (
                <div className="p-6 space-y-5">
                  <div>
                    <label className={LABEL}>Keluhan Utama *</label>
                    <textarea rows={3} value={complaint} onChange={e => setComplaint(e.target.value)}
                      placeholder="Tulis keluhan utama pasien secara singkat..." className={TA} />
                  </div>
                  <div>
                    <label className={LABEL}>Anamnesis</label>
                    <p className="text-xs text-muted-foreground mb-2">Riwayat penyakit, pengobatan, dan keluarga</p>
                    <textarea rows={5} value={soapSubjective} onChange={e => setSoapSubjective(e.target.value)}
                      placeholder="Pasien datang dengan keluhan... Riwayat penyakit dahulu... Riwayat keluarga..." className={TA} />
                  </div>
                  <div>
                    <label className={LABEL}>Catatan Alergi Kunjungan Ini</label>
                    <textarea rows={2} value={allergyNotes} onChange={e => setAllergyNotes(e.target.value)}
                      placeholder="Tidak ada alergi yang diketahui" className={TA} />
                  </div>
                </div>
              )}

              {/* O — Objektif */}
              {tab === 'O' && (
                <div className="p-6 space-y-5">
                  <div>
                    <p className={LABEL}>Vital Signs</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      <div className="col-span-2 sm:col-span-1">
                        <label className={LABEL}>Tekanan Darah</label>
                        <div className="flex items-center gap-2">
                          <input type="number" value={bpSys} onChange={e => setBpSys(e.target.value)}
                            placeholder="120" className={`${INPUT} text-center tabular-nums`} />
                          <span className="font-black text-muted-foreground flex-shrink-0">/</span>
                          <input type="number" value={bpDia} onChange={e => setBpDia(e.target.value)}
                            placeholder="80" className={`${INPUT} text-center tabular-nums`} />
                        </div>
                        <span className="text-xs text-muted-foreground">mmHg</span>
                      </div>
                      {([
                        { label: 'Suhu',         val: temp,      set: setTemp,      ph: '36.5', unit: '°C',  step: '0.1' },
                        { label: 'Nadi',         val: heartRate, set: setHeartRate, ph: '72',   unit: 'bpm', step: '1' },
                        { label: 'Berat Badan',  val: weight,    set: setWeight,    ph: '60',   unit: 'kg',  step: '0.1' },
                        { label: 'Tinggi Badan', val: height,    set: setHeight,    ph: '165',  unit: 'cm',  step: '0.1' },
                      ] as const).map(f => (
                        <div key={f.label}>
                          <label className={LABEL}>{f.label}</label>
                          <input type="number" step={f.step} value={f.val}
                            onChange={e => f.set(e.target.value)} placeholder={f.ph}
                            className={`${INPUT} text-center tabular-nums`} />
                          <span className="text-xs text-muted-foreground">{f.unit}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className={LABEL}>Pemeriksaan Fisik & Penunjang</label>
                    <textarea rows={5} value={soapObjective} onChange={e => setSoapObjective(e.target.value)}
                      placeholder="Keadaan umum: composmentis. Pemeriksaan fisik: ... Penunjang: ..." className={TA} />
                  </div>
                </div>
              )}

              {/* A — Assessment */}
              {tab === 'A' && (
                <div className="p-6 space-y-5">
                  <div>
                    <label className={LABEL}>Diagnosis</label>
                    <textarea rows={4} value={soapAssessment} onChange={e => setSoapAssessment(e.target.value)}
                      placeholder="Diagnosis utama dan diagnosis banding..." className={TA} />
                  </div>
                  <div>
                    <label className={LABEL}>Kode ICD-10</label>
                    <div className="flex gap-2 mb-3">
                      <input value={icd10Input} onChange={e => setIcd10Input(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addIcd10())}
                        placeholder="Ketik kode lalu Enter" className={`${INPUT} flex-1`} />
                      <button type="button" onClick={addIcd10}
                        className="px-4 py-2 bg-primary text-white rounded-xl font-bold hover:bg-primary-hover transition-colors">
                        <Tag size={14} />
                      </button>
                    </div>
                    {icd10Codes.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {icd10Codes.map(code => (
                          <span key={code} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-bold">
                            {code}
                            <button onClick={() => setIcd10Codes(c => c.filter(x => x !== code))} className="hover:text-destructive transition-colors">
                              <X size={11} />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                      <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-2">Contoh ICD-10 Umum</p>
                      <div className="flex flex-wrap gap-2">
                        {ICD10_HINTS.map(h => (
                          <button key={h.code} type="button"
                            onClick={() => { if (!icd10Codes.includes(h.code)) setIcd10Codes(c => [...c, h.code]) }}
                            className="px-2.5 py-1 bg-white border border-gray-200 rounded-full text-xs text-secondary font-medium hover:border-primary hover:text-primary transition-colors">
                            {h.code} · {h.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* P — Plan */}
              {tab === 'P' && (
                <div className="p-6 space-y-5">
                  <div>
                    <label className={LABEL}>Rencana Terapi</label>
                    <textarea rows={3} value={soapPlan} onChange={e => setSoapPlan(e.target.value)}
                      placeholder="Tatalaksana: edukasi, diet, terapi farmakologis..." className={TA} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={LABEL}>Kontrol Ulang</label>
                      <input type="date" value={followUpDate} onChange={e => setFollowUpDate(e.target.value)} className={INPUT} />
                    </div>
                    <div>
                      <label className={LABEL}>Rujukan (opsional)</label>
                      <input value={referral} onChange={e => setReferral(e.target.value)}
                        placeholder="RS / Spesialis tujuan" className={INPUT} />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <p className={LABEL}>Resep Obat</p>
                      <button onClick={addMed}
                        className="flex items-center gap-1.5 px-3 py-2 bg-primary/10 text-primary rounded-xl hover:bg-primary/20 transition-colors font-bold text-sm">
                        <Plus size={14} /> Tambah Obat
                      </button>
                    </div>
                    <div className="space-y-3">
                      {meds.map((m, i) => (
                        <div key={i} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                            <div className="sm:col-span-2">
                              <input value={m.medication_name} onChange={e => updateMed(i, 'medication_name', e.target.value)}
                                placeholder="Nama obat" className={INPUT} />
                            </div>
                            <input value={m.dosage}    onChange={e => updateMed(i, 'dosage',    e.target.value)} placeholder="Dosis (500mg)"     className={INPUT} />
                            <input value={m.frequency} onChange={e => updateMed(i, 'frequency', e.target.value)} placeholder="Frekuensi (3×/hari)" className={INPUT} />
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            <input value={m.duration} onChange={e => updateMed(i, 'duration', e.target.value)} placeholder="Durasi (5 hari)"       className={INPUT} />
                            <input value={m.route}    onChange={e => updateMed(i, 'route',    e.target.value)} placeholder="Cara (oral, injeksi)"  className={INPUT} />
                            <div className="sm:col-span-2 flex gap-2">
                              <input value={m.instructions} onChange={e => updateMed(i, 'instructions', e.target.value)}
                                placeholder="Instruksi (sesudah makan, dll)" className={`${INPUT} flex-1`} />
                              {meds.length > 1 && (
                                <button onClick={() => removeMed(i)} className="p-2 text-destructive hover:bg-destructive/10 rounded-xl flex-shrink-0">
                                  <X size={16} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Pagination dots */}
            <div className="flex justify-between items-center">
              <button onClick={prevTab} disabled={tab === 'S'}
                className="px-4 py-2 text-sm font-bold text-secondary border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:invisible">
                ← Sebelumnya
              </button>
              <div className="flex gap-1.5">
                {TABS.map(t => (
                  <button key={t.id} onClick={() => setTab(t.id)}
                    className={`w-2.5 h-2.5 rounded-full transition-all ${tab === t.id ? 'bg-primary scale-125' : 'bg-gray-200'}`} />
                ))}
              </div>
              <button onClick={nextTab} disabled={tab === 'P'}
                className="px-4 py-2 text-sm font-bold text-secondary border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:invisible">
                Berikutnya →
              </button>
            </div>

            <div className="flex gap-3 pb-4">
              <button onClick={saveDraft}
                className="flex-1 py-3.5 bg-white border border-gray-200 text-secondary rounded-xl hover:bg-gray-50 transition-colors font-bold text-sm">
                Simpan Draft
              </button>
              <button onClick={() => handleSave(false)} disabled={pending}
                className="flex-1 py-3.5 bg-white border border-gray-200 text-secondary rounded-xl hover:bg-gray-50 transition-colors font-bold text-sm disabled:opacity-50">
                {pending ? 'Menyimpan...' : 'Simpan'}
              </button>
              <button onClick={() => handleSave(true)} disabled={pending}
                className="flex-1 py-3.5 bg-primary text-white rounded-xl hover:bg-primary-hover transition-colors font-bold text-sm shadow-sm disabled:opacity-50">
                {pending ? 'Menyimpan...' : 'Simpan & Selesai'}
              </button>
            </div>

            {/* Surat Keterangan Shortcut */}
            <LetterQuickSection
              patientId={patient.id}
              appointmentId={appointment.id}
              diagnosis={soapAssessment}
            />

            {/* Resep Obat */}
            {saved && (
              <PrescriptionForm
                appointmentId={appointment.id}
                patientId={patient.id}
              />
            )}
          </div>

          {/* Patient sidebar */}
          <div>
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm sticky top-6">
              <div className="flex items-center gap-4 mb-5 pb-5 border-b border-gray-100">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${avatarGrad(patient.full_name)} flex items-center justify-center text-white font-black text-lg flex-shrink-0`}>
                  {patient.full_name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-black text-secondary">{patient.full_name}</h3>
                  <p className="text-sm text-muted-foreground font-semibold">{patient.no_rm}</p>
                </div>
              </div>

              <div className="space-y-3 mb-5">
                {([
                  { label: 'Usia',           value: calcAge(patient.date_of_birth) },
                  { label: 'Jenis Kelamin',  value: patient.gender === 'male' ? 'Laki-laki' : patient.gender === 'female' ? 'Perempuan' : '—' },
                  { label: 'Golongan Darah', value: patient.blood_type ?? '—', cls: 'text-destructive' },
                  { label: 'Berat / Tinggi', value: `${patient.weight ?? '—'} kg / ${patient.height ?? '—'} cm` },
                ] as { label: string; value: string; cls?: string }[]).map(row => (
                  <div key={row.label}>
                    <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-0.5">{row.label}</p>
                    <p className={`text-sm font-bold ${row.cls ?? 'text-secondary'}`}>{row.value}</p>
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
                    {history.map(v => {
                      const dx = v.soap_assessment ?? v.diagnoses?.[0] ?? 'Kunjungan'
                      return (
                        <div key={v.id} className="flex items-start gap-3">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                          <div>
                            <p className="text-xs font-bold text-secondary">{dx}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {new Date(v.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                              {(v.doctors as { full_name?: string } | null)?.full_name ? ` · ${(v.doctors as { full_name: string }).full_name}` : ''}
                            </p>
                          </div>
                        </div>
                      )
                    })}
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
