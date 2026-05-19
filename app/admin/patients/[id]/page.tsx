'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import TopBar from '@/components/TopBar'
import { ArrowLeft, User, Phone, FileText, CreditCard, Loader2, Download } from 'lucide-react'

type Patient = {
  id: string; full_name: string; no_rm: string; phone: string | null
  date_of_birth: string | null; gender: string | null; blood_type: string | null
  allergies: string | null; address: string | null; emergency_contact: string | null
  emergency_phone: string | null; no_bpjs: string | null; jenis_penjamin: string | null
}
type Stats = { total_visits: number; total_spent: number; last_visit: string | null }
type Appointment = { id: string; scheduled_at: string; status: string; complaint: string | null; type: string; doctors: { full_name: string } | null }
type MedRecord = { id: string; created_at: string; soap_assessment: string | null; diagnoses: string[]; blood_pressure_sys: number | null; blood_pressure_dia: number | null; temperature: number | null; heart_rate: number | null; weight: number | null; height: number | null; doctors: { full_name: string } | null; prescriptions: { medication_name: string; dosage: string; frequency: string; duration: string }[] }
type Bill      = { id: string; invoice_number: string; total: number; status: string; created_at: string }
type Letter    = { id: string; letter_number: string; type: string; diagnosis: string | null; created_at: string; doctors: { full_name: string } | null }

type Data = { patient: Patient; stats: Stats; appointments: Appointment[]; records: MedRecord[]; billing: Bill[]; letters: Letter[] }

const STATUS_STYLE: Record<string, string> = {
  selesai: 'bg-emerald-100 text-emerald-700', batal: 'bg-red-100 text-red-600',
  menunggu: 'bg-amber-100 text-amber-700', diperiksa: 'bg-blue-100 text-blue-700', dipanggil: 'bg-cyan-100 text-cyan-700',
}
const LETTER_BADGE: Record<string, string> = {
  sakit: 'bg-red-100 text-red-700', sehat: 'bg-green-100 text-green-700', rujukan: 'bg-blue-100 text-blue-700',
}
const PENJAMIN_BADGE: Record<string, string> = {
  umum: 'bg-gray-100 text-gray-600', bpjs: 'bg-cyan-100 text-cyan-700', asuransi: 'bg-violet-100 text-violet-700',
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso))
}
function fmtDateTime(iso: string) {
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
}
function fmtRupiah(n: number) {
  return 'Rp ' + n.toLocaleString('id-ID')
}
function calcAge(dob: string | null) {
  if (!dob) return null
  return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 86400000))
}

type Tab = 'visits' | 'records' | 'billing' | 'letters'

export default function PatientDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [data,    setData]    = useState<Data | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab,     setTab]     = useState<Tab>('visits')
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/admin/patients/${id}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 size={28} className="animate-spin text-primary" />
    </div>
  )
  if (!data) return (
    <div className="min-h-screen bg-background">
      <TopBar title="Detail Pasien" subtitle="" showSearch={false} />
      <div className="p-8 text-center text-muted-foreground">Pasien tidak ditemukan.</div>
    </div>
  )

  const { patient, stats, appointments, records, billing, letters } = data
  const age        = calcAge(patient.date_of_birth)
  const initials   = patient.full_name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
  const penjamin   = patient.jenis_penjamin ?? 'umum'

  return (
    <div className="min-h-screen bg-background">
      <TopBar title="Detail Pasien" subtitle={patient.no_rm} showSearch={false} />
      <div className="p-6 lg:p-8 max-w-5xl mx-auto">

        {/* Breadcrumb + back */}
        <button onClick={() => router.back()} className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-secondary mb-5 transition-colors">
          <ArrowLeft size={15} /> Kembali ke Pasien
        </button>

        {/* Header */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-5">
          <div className="flex items-center gap-5 flex-wrap">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white font-black text-xl flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl font-black text-secondary">{patient.full_name}</h1>
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize ${PENJAMIN_BADGE[penjamin]}`}>
                  {penjamin.toUpperCase()}
                </span>
              </div>
              <p className="text-sm text-muted-foreground font-semibold mt-0.5">
                {patient.no_rm} {age ? `· ${age} tahun` : ''} {patient.gender ? `· ${patient.gender === 'male' ? 'Laki-laki' : 'Perempuan'}` : ''}
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <a href={`/admin/appointments/walkin`}
                className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary-hover transition-colors">
                + Appointment
              </a>
              <a href={`/admin/medical-letters`}
                className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-200 transition-colors">
                <FileText size={14} /> Buat Surat
              </a>
            </div>
          </div>
        </div>

        {/* Info + Stats */}
        <div className="grid lg:grid-cols-3 gap-5 mb-5">
          {/* Info Pribadi */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-primary/10 rounded-xl flex items-center justify-center"><User size={15} className="text-primary" /></div>
              <h3 className="font-black text-secondary text-sm">Informasi Pasien</h3>
            </div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
              {([
                ['Tanggal Lahir', fmtDate(patient.date_of_birth)],
                ['Jenis Kelamin', patient.gender === 'male' ? 'Laki-laki' : patient.gender === 'female' ? 'Perempuan' : '—'],
                ['Golongan Darah', patient.blood_type ?? '—'],
                ['Alergi', patient.allergies ?? '—'],
                ['Telepon', patient.phone ?? '—'],
                ['Kontak Darurat', patient.emergency_contact ? `${patient.emergency_contact} (${patient.emergency_phone ?? '—'})` : '—'],
                ['No. BPJS', patient.no_bpjs ?? '—'],
                ['Alamat', patient.address ?? '—'],
              ] as [string, string][]).map(([label, value]) => (
                <div key={label}>
                  <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-0.5">{label}</p>
                  <p className="font-semibold text-secondary text-sm">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="space-y-4">
            {([
              { label: 'Total Kunjungan', value: stats.total_visits, icon: Phone, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Total Tagihan', value: fmtRupiah(stats.total_spent), icon: CreditCard, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            ]).map(s => (
              <div key={s.label} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <div className={`w-9 h-9 ${s.bg} rounded-xl flex items-center justify-center mb-3`}>
                  <s.icon size={16} className={s.color} />
                </div>
                <p className="text-2xl font-black text-secondary">{s.value}</p>
                <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-1">Kunjungan Terakhir</p>
              <p className="font-black text-secondary text-sm">{stats.last_visit ? fmtDateTime(stats.last_visit) : '—'}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex border-b border-gray-100 overflow-x-auto">
            {([
              { id: 'visits', label: 'Riwayat Kunjungan', count: appointments.length },
              { id: 'records', label: 'Rekam Medis', count: records.length },
              { id: 'billing', label: 'Tagihan', count: billing.length },
              { id: 'letters', label: 'Surat Keterangan', count: letters.length },
            ] as { id: Tab; label: string; count: number }[]).map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-5 py-4 font-bold text-sm whitespace-nowrap transition-all ${tab === t.id ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-secondary'}`}>
                {t.label}
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${tab === t.id ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-500'}`}>{t.count}</span>
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* Visits Tab */}
            {tab === 'visits' && (
              appointments.length === 0 ? <p className="text-muted-foreground text-sm text-center py-8">Belum ada kunjungan</p> :
              <div className="space-y-3">
                {appointments.map((a: Appointment) => (
                  <div key={a.id} className="flex items-start gap-4 p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors">
                    <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-secondary text-sm">{fmtDateTime(a.scheduled_at)}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${STATUS_STYLE[a.status] ?? 'bg-gray-100 text-gray-500'}`}>{a.status}</span>
                        <span className="text-xs text-gray-400 capitalize">{a.type}</span>
                      </div>
                      {a.complaint && <p className="text-xs text-muted-foreground mt-1 truncate">{a.complaint}</p>}
                      {(a.doctors as any)?.full_name && <p className="text-xs text-gray-400 mt-0.5">dr. {(a.doctors as any).full_name}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Records Tab */}
            {tab === 'records' && (
              records.length === 0 ? <p className="text-muted-foreground text-sm text-center py-8">Belum ada rekam medis</p> :
              <div className="space-y-3">
                {records.map((r: MedRecord) => (
                  <div key={r.id} className="border border-gray-100 rounded-xl overflow-hidden">
                    <button onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                      className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors text-left">
                      <div>
                        <p className="font-bold text-secondary text-sm">{fmtDateTime(r.created_at)}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{r.soap_assessment ?? (r.diagnoses[0] ?? 'Kunjungan')}</p>
                        {(r.doctors as any)?.full_name && <p className="text-xs text-gray-400">dr. {(r.doctors as any).full_name}</p>}
                      </div>
                      <span className="text-gray-300 text-lg">{expanded === r.id ? '▲' : '▼'}</span>
                    </button>
                    {expanded === r.id && (
                      <div className="px-4 pb-4 space-y-3 border-t border-gray-50 pt-3">
                        {(r.blood_pressure_sys || r.temperature || r.heart_rate || r.weight) && (
                          <div className="grid grid-cols-4 gap-3">
                            {[
                              { label: 'TD', value: r.blood_pressure_sys ? `${r.blood_pressure_sys}/${r.blood_pressure_dia}` : null, unit: 'mmHg' },
                              { label: 'Suhu', value: r.temperature, unit: '°C' },
                              { label: 'Nadi', value: r.heart_rate, unit: 'bpm' },
                              { label: 'BB/TB', value: (r.weight || r.height) ? `${r.weight ?? '—'}/${r.height ?? '—'}` : null, unit: 'kg/cm' },
                            ].map(v => v.value && (
                              <div key={v.label} className="bg-gray-50 rounded-lg p-2 text-center">
                                <p className="text-[10px] font-bold text-gray-400">{v.label}</p>
                                <p className="text-xs font-black text-secondary mt-0.5">{v.value}</p>
                                <p className="text-[9px] text-gray-300">{v.unit}</p>
                              </div>
                            ))}
                          </div>
                        )}
                        {r.soap_assessment && <div><p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Assessment</p><p className="text-xs text-secondary">{r.soap_assessment}</p></div>}
                        {(r.prescriptions as any[])?.length > 0 && (
                          <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Resep</p>
                            <div className="space-y-1">
                              {(r.prescriptions as any[]).map((rx, i) => (
                                <p key={i} className="text-xs text-secondary">{rx.medication_name} {rx.dosage} — {rx.frequency} — {rx.duration}</p>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Billing Tab */}
            {tab === 'billing' && (
              billing.length === 0 ? <p className="text-muted-foreground text-sm text-center py-8">Belum ada tagihan</p> :
              <div className="space-y-3">
                {billing.map((b: Bill) => (
                  <div key={b.id} className="flex items-center gap-4 p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors">
                    <div className="flex-1">
                      <p className="font-mono text-xs font-bold text-gray-600">{b.invoice_number}</p>
                      <p className="font-black text-secondary">{fmtRupiah(b.total)}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{fmtDate(b.created_at)}</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${b.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {b.status === 'paid' ? 'Lunas' : 'Pending'}
                    </span>
                    <a href={`/api/admin/billing/${b.id}/pdf`} target="_blank"
                      className="p-2 text-gray-400 hover:text-primary transition-colors">
                      <Download size={15} />
                    </a>
                  </div>
                ))}
              </div>
            )}

            {/* Letters Tab */}
            {tab === 'letters' && (
              letters.length === 0 ? <p className="text-muted-foreground text-sm text-center py-8">Belum ada surat keterangan</p> :
              <div className="space-y-3">
                {letters.map((l: Letter) => (
                  <div key={l.id} className="flex items-center gap-4 p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors">
                    <div className="flex-1">
                      <p className="font-mono text-xs font-bold text-gray-600">{l.letter_number}</p>
                      {l.diagnosis && <p className="text-xs text-gray-500 mt-0.5 truncate">{l.diagnosis}</p>}
                      <p className="text-xs text-gray-400">{fmtDate(l.created_at)} · {(l.doctors as any)?.full_name ? `dr. ${(l.doctors as any).full_name}` : ''}</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${LETTER_BADGE[l.type] ?? 'bg-gray-100 text-gray-600'}`}>{l.type}</span>
                    <a href={`/api/admin/medical-letters/${l.id}/pdf`} target="_blank"
                      className="p-2 text-gray-400 hover:text-primary transition-colors">
                      <Download size={15} />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
