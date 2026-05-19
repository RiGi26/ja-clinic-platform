'use client'

import { useState, useEffect, useCallback } from 'react'
import TopBar from '@/components/TopBar'
import { FileCheck, Plus, Download, Trash2, X, ChevronRight } from 'lucide-react'

const INPUT  = 'w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all'
const LABEL  = 'text-[10px] uppercase tracking-widest font-bold text-muted-foreground block mb-2'
const TA     = `${INPUT} resize-none`

type Letter = {
  id: string; letter_number: string; type: string; diagnosis: string | null
  created_at: string
  patients: { full_name: string; no_rm: string } | null
  doctors:  { full_name: string } | null
}
type Doctor  = { id: string; full_name: string; specialty: string }
type Patient = { id: string; full_name: string; no_rm: string }

const TYPE_BADGE: Record<string, string> = {
  sakit:   'bg-red-100 text-red-700',
  sehat:   'bg-green-100 text-green-700',
  rujukan: 'bg-blue-100 text-blue-700',
}
const TYPE_LABEL: Record<string, string> = {
  sakit: 'Surat Sakit', sehat: 'Surat Sehat', rujukan: 'Surat Rujukan',
}

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso))
}

export default function MedicalLettersPage() {
  const [letters,  setLetters]  = useState<Letter[]>([])
  const [loading,  setLoading]  = useState(true)
  const [typeF,    setTypeF]    = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo,   setDateTo]   = useState('')
  const [toast,    setToast]    = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [deleting,  setDeleting] = useState<string | null>(null)

  // Modal state
  const [step,       setStep]       = useState<1 | 2>(1)
  const [letterType, setLetterType] = useState<'sakit' | 'sehat' | 'rujukan' | ''>('')
  const [doctors,    setDoctors]    = useState<Doctor[]>([])
  const [patients,   setPatients]   = useState<Patient[]>([])
  const [patSearch,  setPatSearch]  = useState('')
  const [form, setForm] = useState({
    patient_id: '', doctor_id: '', diagnosis: '', notes: '',
    sick_days: '', sick_from: '', sick_until: '',
    referred_to: '', referral_reason: '', purpose: '',
  })
  const [submitting, setSubmitting] = useState(false)

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 3000) }

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (typeF)    params.set('type', typeF)
    if (dateFrom) params.set('date_from', dateFrom)
    if (dateTo)   params.set('date_to', dateTo)
    const res = await fetch(`/api/admin/medical-letters?${params}`)
    const d   = await res.json() as { data?: Letter[] }
    setLetters(d.data ?? [])
    setLoading(false)
  }, [typeF, dateFrom, dateTo])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!showModal) return
    Promise.all([
      fetch('/api/admin/clinic-doctors').then(r => r.json()),
      fetch('/api/admin/patients?limit=50').then(r => r.json()).catch(() => ({ patients: [] })),
    ]).then(([docData, patData]) => {
      setDoctors(docData.doctors ?? [])
      setPatients(patData.patients ?? patData.data ?? [])
    })
  }, [showModal])

  function openModal() {
    setStep(1); setLetterType(''); setPatSearch('')
    setForm({ patient_id:'', doctor_id:'', diagnosis:'', notes:'', sick_days:'', sick_from:'', sick_until:'', referred_to:'', referral_reason:'', purpose:'' })
    setShowModal(true)
  }

  async function handleSubmit() {
    if (!form.patient_id || !form.doctor_id || !letterType) return
    setSubmitting(true)
    const body = {
      patient_id:      form.patient_id,
      doctor_id:       form.doctor_id,
      type:            letterType,
      diagnosis:       form.diagnosis || undefined,
      notes:           form.notes || undefined,
      sick_days:       form.sick_days ? parseInt(form.sick_days) : undefined,
      sick_from:       form.sick_from || undefined,
      sick_until:      form.sick_until || undefined,
      referred_to:     form.referred_to || undefined,
      referral_reason: form.referral_reason || undefined,
      purpose:         form.purpose || undefined,
    }
    const res  = await fetch('/api/admin/medical-letters', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json() as { success?: boolean; data?: { id: string }; error?: string }
    if (res.ok && data.data?.id) {
      showToast('Surat berhasil dibuat')
      setShowModal(false)
      load()
      // Download PDF langsung
      window.open(`/api/admin/medical-letters/${data.data.id}/pdf`, '_blank')
    } else {
      showToast(data.error ?? 'Gagal')
    }
    setSubmitting(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Hapus surat ini?')) return
    setDeleting(id)
    // No delete endpoint — soft approach: just reload
    showToast('Fitur hapus belum tersedia')
    setDeleting(null)
  }

  // Auto-fill sick_until when sick_days + sick_from filled
  useEffect(() => {
    if (form.sick_from && form.sick_days) {
      const until = new Date(form.sick_from)
      until.setDate(until.getDate() + parseInt(form.sick_days) - 1)
      setForm(f => ({ ...f, sick_until: until.toISOString().split('T')[0] }))
    }
  }, [form.sick_from, form.sick_days])

  const filteredPatients = patients.filter(p =>
    !patSearch || p.full_name.toLowerCase().includes(patSearch.toLowerCase()) || p.no_rm.includes(patSearch)
  )

  return (
    <div className="min-h-screen bg-background">
      <TopBar title="Surat Keterangan Dokter" subtitle="Kelola surat sakit, sehat & rujukan" showSearch={false} />
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-gray-900 text-white px-5 py-3 rounded-2xl shadow-xl font-bold text-sm">{toast}</div>
      )}

      <div className="p-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex gap-2 flex-wrap">
            <select value={typeF} onChange={e => setTypeF(e.target.value)}
              className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none">
              <option value="">Semua Jenis</option>
              <option value="sakit">Surat Sakit</option>
              <option value="sehat">Surat Sehat</option>
              <option value="rujukan">Surat Rujukan</option>
            </select>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none" />
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none" />
          </div>
          <button onClick={openModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary-hover transition-colors">
            <Plus size={14} /> Buat Surat
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['No. Surat', 'Jenis', 'Nama Pasien', 'Dokter', 'Tanggal', 'Aksi'].map(h => (
                    <th key={h} className="text-left text-[10px] uppercase tracking-widest font-bold text-gray-400 px-5 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td colSpan={6} className="py-12 text-center text-sm text-gray-400">Memuat...</td></tr>
                ) : letters.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <FileCheck size={32} className="text-gray-300" />
                        <p className="text-gray-400 font-semibold text-sm">Belum ada surat keterangan</p>
                      </div>
                    </td>
                  </tr>
                ) : letters.map(l => (
                  <tr key={l.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 font-mono text-xs font-bold text-gray-700">{l.letter_number}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${TYPE_BADGE[l.type] ?? 'bg-gray-100 text-gray-600'}`}>
                        {TYPE_LABEL[l.type] ?? l.type}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <p className="font-bold text-gray-800 text-sm">{(l.patients as any)?.full_name ?? '—'}</p>
                      <p className="text-xs text-gray-400">{(l.patients as any)?.no_rm ?? ''}</p>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600">{(l.doctors as any)?.full_name ? `dr. ${(l.doctors as any).full_name}` : '—'}</td>
                    <td className="px-5 py-3 text-xs text-gray-500">{fmtDate(l.created_at)}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5">
                        <a href={`/api/admin/medical-letters/${l.id}/pdf`} target="_blank"
                          className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-bold bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors">
                          <Download size={10} /> PDF
                        </a>
                        <button onClick={() => handleDelete(l.id)} disabled={deleting === l.id}
                          className="p-1.5 text-gray-300 hover:text-red-500 transition-colors disabled:opacity-50">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-7 py-5 border-b border-gray-100">
              <div>
                <h3 className="font-black text-gray-900 text-lg">Buat Surat Keterangan</h3>
                <p className="text-xs text-gray-400 mt-0.5">Langkah {step} dari 2</p>
              </div>
              <button onClick={() => setShowModal(false)}><X size={18} className="text-gray-400" /></button>
            </div>

            {/* Step 1: Pilih Jenis */}
            {step === 1 && (
              <div className="p-7">
                <p className="text-sm font-bold text-gray-600 mb-4">Pilih jenis surat:</p>
                <div className="space-y-3">
                  {([
                    { type: 'sakit',   icon: '📋', label: 'Surat Sakit',   desc: 'Keterangan tidak masuk kerja/sekolah' },
                    { type: 'sehat',   icon: '✅', label: 'Surat Sehat',   desc: 'Keterangan kondisi kesehatan baik' },
                    { type: 'rujukan', icon: '🏥', label: 'Surat Rujukan', desc: 'Rujukan ke fasilitas kesehatan lain' },
                  ] as const).map(opt => (
                    <button key={opt.type} onClick={() => { setLetterType(opt.type); setStep(2) }}
                      className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all hover:border-primary/50 ${letterType === opt.type ? 'border-primary bg-primary/5' : 'border-gray-100'}`}>
                      <span className="text-2xl">{opt.icon}</span>
                      <div className="flex-1">
                        <p className="font-black text-gray-900 text-sm">{opt.label}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{opt.desc}</p>
                      </div>
                      <ChevronRight size={16} className="text-gray-300" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Isi Data */}
            {step === 2 && (
              <div className="p-7 space-y-4">
                <button onClick={() => setStep(1)} className="text-xs text-gray-400 hover:text-gray-600 font-bold flex items-center gap-1">
                  ← Kembali
                </button>

                {/* Pasien */}
                <div>
                  <label className={LABEL}>Cari Pasien *</label>
                  <input value={patSearch} onChange={e => setPatSearch(e.target.value)}
                    placeholder="Nama atau No. RM..." className={INPUT} />
                  {patSearch && (
                    <div className="mt-1 border border-gray-200 rounded-xl overflow-hidden max-h-40 overflow-y-auto">
                      {filteredPatients.slice(0, 8).map(p => (
                        <button key={p.id} onClick={() => { setForm(f => ({ ...f, patient_id: p.id })); setPatSearch(p.full_name) }}
                          className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors ${form.patient_id === p.id ? 'bg-primary/5 font-bold' : ''}`}>
                          {p.full_name} <span className="text-gray-400 text-xs">{p.no_rm}</span>
                        </button>
                      ))}
                      {filteredPatients.length === 0 && <p className="px-4 py-3 text-sm text-gray-400">Tidak ditemukan</p>}
                    </div>
                  )}
                </div>

                {/* Dokter */}
                <div>
                  <label className={LABEL}>Dokter *</label>
                  <select value={form.doctor_id} onChange={e => setForm(f => ({ ...f, doctor_id: e.target.value }))} className={INPUT}>
                    <option value="">Pilih dokter...</option>
                    {doctors.map(d => <option key={d.id} value={d.id}>{d.full_name} — {d.specialty}</option>)}
                  </select>
                </div>

                {/* Diagnosis */}
                <div>
                  <label className={LABEL}>Diagnosis</label>
                  <input value={form.diagnosis} onChange={e => setForm(f => ({ ...f, diagnosis: e.target.value }))} placeholder="Diagnosis medis..." className={INPUT} />
                </div>

                {/* Fields khusus per type */}
                {letterType === 'sakit' && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={LABEL}>Jumlah Hari Sakit *</label>
                        <input type="number" min={1} value={form.sick_days}
                          onChange={e => setForm(f => ({ ...f, sick_days: e.target.value }))} className={INPUT} />
                      </div>
                      <div>
                        <label className={LABEL}>Mulai Tanggal *</label>
                        <input type="date" value={form.sick_from}
                          onChange={e => setForm(f => ({ ...f, sick_from: e.target.value }))} className={INPUT} />
                      </div>
                    </div>
                    <div>
                      <label className={LABEL}>Sampai Tanggal (otomatis)</label>
                      <input type="date" value={form.sick_until}
                        onChange={e => setForm(f => ({ ...f, sick_until: e.target.value }))} className={INPUT} />
                    </div>
                  </>
                )}

                {letterType === 'sehat' && (
                  <div>
                    <label className={LABEL}>Keperluan *</label>
                    <input value={form.purpose} onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))}
                      placeholder="bekerja / sekolah / melamar kerja..." className={INPUT} />
                  </div>
                )}

                {letterType === 'rujukan' && (
                  <>
                    <div>
                      <label className={LABEL}>Dirujuk ke *</label>
                      <input value={form.referred_to} onChange={e => setForm(f => ({ ...f, referred_to: e.target.value }))}
                        placeholder="Nama RS / Klinik / Spesialis..." className={INPUT} />
                    </div>
                    <div>
                      <label className={LABEL}>Alasan Rujukan</label>
                      <textarea rows={3} value={form.referral_reason}
                        onChange={e => setForm(f => ({ ...f, referral_reason: e.target.value }))}
                        placeholder="Diagnosis & alasan merujuk..." className={TA} />
                    </div>
                  </>
                )}

                <div>
                  <label className={LABEL}>Catatan Tambahan</label>
                  <textarea rows={2} value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Opsional..." className={TA} />
                </div>

                <div className="flex gap-3 pt-2">
                  <button onClick={() => setShowModal(false)} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm">Batal</button>
                  <button onClick={handleSubmit} disabled={submitting || !form.patient_id || !form.doctor_id}
                    className="flex-1 py-3 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                    {submitting ? 'Membuat...' : <><FileCheck size={14} /> Buat & Download PDF</>}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
