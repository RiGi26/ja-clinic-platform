import { redirect } from 'next/navigation'
import { getClinicUser } from '@/lib/clinic'
import { createAdminClient } from '@/lib/supabase/server'
import { Calendar, Activity, FileText, Clock } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function PatientDashboardPage() {
  const user = await getClinicUser()
  if (user.role !== 'patient') redirect('/auth/login')

  const db = createAdminClient()

  const { data: patientRec } = await db
    .from('patients')
    .select('id, no_rm, blood_type, weight, height, allergies')
    .eq('user_id', user.id)
    .eq('clinic_id', user.clinic_id)
    .single()

  const now = new Date().toISOString()

  const [{ data: nextApts }, { data: lastVisits }] = await Promise.all([
    patientRec ? db.from('appointments')
      .select('id, scheduled_at, complaint, doctors(full_name, specialty)')
      .eq('clinic_id', user.clinic_id)
      .eq('patient_id', patientRec.id)
      .gt('scheduled_at', now)
      .neq('status', 'batal')
      .order('scheduled_at', { ascending: true })
      .limit(1) : { data: [] },
    patientRec ? db.from('medical_records')
      .select('diagnoses, blood_pressure_sys, blood_pressure_dia, weight, height, created_at, doctors(full_name)')
      .eq('clinic_id', user.clinic_id)
      .eq('patient_id', patientRec.id)
      .order('created_at', { ascending: false })
      .limit(1) : { data: [] },
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const apt  = (nextApts  as any[])?.[0]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const last = (lastVisits as any[])?.[0]

  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long', year:'numeric' })
  const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' })

  const nameFirst = user.full_name?.split(' ')[0] || 'User'

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-16 animate-fade-in">
      
      {/* ─── Header Section ────────────────────────────────── */}
      <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-6">
        <div>
          <p className="text-[12px] text-gray-500 mb-1.5 font-bold uppercase tracking-widest flex items-center gap-2 sf-display">
            <span className="w-2 h-2 rounded-full bg-apple-blue"></span>
            Patient Portal • {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' })}
          </p>
          <h2 className="text-[32px] md:text-[40px] sf-display-heavy tracking-tight text-[#1D1D1F] leading-tight">
            Okaeri, {nameFirst}.
          </h2>
          <p className="text-gray-500 text-sm mt-1 sf-display">Selamat datang kembali di Japan Arena Clinic.</p>
        </div>
        
        <Link href="/patient/booking"
          className="bg-apple-blue text-white px-8 py-3.5 rounded-full text-[15px] sf-display-heavy shadow-lg glow-button text-center">
          Buat Appointment Baru
        </Link>
      </header>

      {/* ─── Primary Action: Upcoming Appointment ────────────────────── */}
      {apt ? (
        <div className="bg-[#1D1D1F] text-white rounded-[32px] p-8 md:p-10 apple-shadow relative overflow-hidden group animate-fade-up">
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-apple-blue opacity-10 rounded-full blur-[100px]"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest text-apple-blue">
                Kunjungan Terdekat
              </div>
              <h2 className="text-3xl md:text-4xl sf-display-heavy tracking-tight">{apt.complaint ?? 'Konsultasi Medis'}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-3">
                <div className="flex items-center gap-3 text-gray-300">
                    <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center"><Calendar size={18} className="text-apple-blue" /></div>
                    <span className="font-semibold text-sm">{fmtDate(apt.scheduled_at)}</span>
                </div>
                <div className="flex items-center gap-3 text-gray-300">
                    <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center"><Clock size={18} className="text-apple-blue" /></div>
                    <span className="font-semibold text-sm">{fmtTime(apt.scheduled_at)} WIB</span>
                </div>
                <div className="flex items-center gap-3 text-gray-300">
                    <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center"><Activity size={18} className="text-apple-blue" /></div>
                    <span className="font-semibold text-sm">{(apt.doctors as any)?.full_name ?? '—'}</span>
                </div>
              </div>
            </div>
            
            <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-[28px] p-8 text-center min-w-[140px]">
              <p className="text-6xl font-black tracking-tighter mb-1 text-white">{new Date(apt.scheduled_at).getDate()}</p>
              <p className="text-[13px] font-bold text-apple-blue uppercase tracking-widest">{new Date(apt.scheduled_at).toLocaleDateString('id-ID',{month:'long'})}</p>
            </div>
          </div>
          
          <div className="mt-10 pt-8 border-t border-white/5 flex gap-4 relative z-10">
            <button className="bg-white text-black px-6 py-2.5 rounded-full font-bold text-sm hover:bg-gray-100 transition-all">Peta Lokasi</button>
            <button className="bg-white/10 text-white border border-white/20 px-6 py-2.5 rounded-full font-bold text-sm hover:bg-white/20 transition-all">Reschedule</button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-[32px] p-10 md:p-12 text-center apple-shadow border border-black/[0.03] animate-fade-up">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Calendar size={40} className="text-gray-200" />
          </div>
          <h2 className="text-2xl sf-display-heavy text-[#1D1D1F] mb-2">Belum ada jadwal kunjungan</h2>
          <p className="text-gray-500 mb-8 max-w-sm mx-auto leading-relaxed">Jadwalkan konsultasi dengan dokter spesialis kami dengan menekan tombol di bawah.</p>
          <Link href="/patient/booking" className="inline-flex items-center gap-2 px-8 py-3.5 bg-apple-blue text-white rounded-full font-bold text-[15px] shadow-lg glow-button">
            <Calendar size={18} /> Atur Jadwal Sekarang
          </Link>
        </div>
      )}

      {/* ─── Health Cards Row ────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-up delay-100">
        
        {/* Vital Signs / Summary */}
        <div className="bg-white rounded-[32px] p-8 apple-shadow border border-black/[0.03]">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-[12px] uppercase tracking-widest font-bold text-gray-400">Status Kesehatan Terakhir</h3>
            <Activity size={18} className="text-emerald-500" />
          </div>
          
          {last ? (
            <div className="space-y-6">
                <div className="flex justify-between items-end border-b border-black/5 pb-4">
                    <div>
                        <p className="text-[11px] text-gray-400 font-bold uppercase mb-1">Tekanan Darah</p>
                        <p className="text-2xl sf-display-heavy text-[#1D1D1F] tabular-nums">{last.blood_pressure_sys}/{last.blood_pressure_dia} <span className="text-xs text-gray-400 font-normal">mmHg</span></p>
                    </div>
                    <div className="px-2 py-1 bg-[#F3FBF5] text-green-600 rounded-lg text-[10px] font-bold">NORMAL</div>
                </div>
                <div className="flex justify-between items-end border-b border-black/5 pb-4">
                    <div>
                        <p className="text-[11px] text-gray-400 font-bold uppercase mb-1">Berat Badan</p>
                        <p className="text-2xl sf-display-heavy text-[#1D1D1F] tabular-nums">{last.weight ?? '—'} <span className="text-xs text-gray-400 font-normal">kg</span></p>
                    </div>
                </div>
                <div className="flex justify-between items-end">
                    <div>
                        <p className="text-[11px] text-gray-400 font-bold uppercase mb-1">Golongan Darah</p>
                        <p className="text-2xl sf-display-heavy text-[#FF3B30]">{patientRec?.blood_type ?? '—'}</p>
                    </div>
                    {patientRec?.allergies && (
                        <div className="px-2 py-1 bg-red-50 text-red-600 rounded-lg text-[10px] font-bold border border-red-100">ALERGI: {patientRec.allergies}</div>
                    )}
                </div>
            </div>
          ) : (
            <div className="py-8 text-center border-2 border-dashed border-gray-100 rounded-2xl">
                <p className="text-sm text-gray-400 sf-display">Data kesehatan akan muncul setelah kunjungan pertama Anda.</p>
            </div>
          )}
        </div>

        {/* Recent Visit Details */}
        <div className="bg-white rounded-[32px] p-8 apple-shadow border border-black/[0.03]">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-[12px] uppercase tracking-widest font-bold text-gray-400">Histori Kunjungan</h3>
            <Link href="/patient/records" className="text-[11px] font-bold text-apple-blue hover:underline">LIHAT SEMUA</Link>
          </div>
          
          {last ? (
            <div className="flex flex-col h-full">
                <div className="bg-gray-50/50 rounded-2xl p-5 mb-6 border border-black/5">
                    <p className="text-lg sf-display-heavy text-[#1D1D1F] mb-1">{new Date(last.created_at).toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'})}</p>
                    <p className="text-sm text-gray-500 sf-display">Ditangani oleh {(last.doctors as any)?.full_name ?? 'Dokter Klinik'}</p>
                </div>
                
                {last.diagnoses?.length > 0 && (
                    <div className="flex-1">
                        <p className="text-[11px] uppercase tracking-widest font-bold text-gray-400 mb-3">Diagnosis Utama</p>
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 text-apple-blue flex items-center justify-center shrink-0"><FileText size={20}/></div>
                            <p className="text-[15px] font-semibold text-[#1D1D1F] leading-tight pt-1">{last.diagnoses[0]}</p>
                        </div>
                    </div>
                )}
            </div>
          ) : (
            <div className="py-8 text-center border-2 border-dashed border-gray-100 rounded-2xl h-full flex items-center justify-center">
                <p className="text-sm text-gray-400 sf-display">Belum ada riwayat kunjungan medis.</p>
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
