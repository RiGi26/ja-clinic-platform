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

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">

      {/* Appointment ticket */}
      {apt ? (
        <div className="rounded-3xl p-8 text-white shadow-xl" style={{ background:'linear-gradient(135deg, #0891B2, #06B6D4)' }}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest font-bold mb-2 text-cyan-100">Appointment Berikutnya</p>
              <h2 className="text-3xl font-black mb-5">{apt.complaint ?? 'Kunjungan Rutin'}</h2>
              <div className="space-y-2">
                <div className="flex items-center gap-3"><Calendar size={18} className="text-cyan-100 flex-shrink-0" /><span className="font-bold text-sm">{fmtDate(apt.scheduled_at)}</span></div>
                <div className="flex items-center gap-3"><Clock size={18} className="text-cyan-100 flex-shrink-0" /><span className="font-bold text-sm">{fmtTime(apt.scheduled_at)} WIB</span></div>
                <div className="flex items-center gap-3"><Activity size={18} className="text-cyan-100 flex-shrink-0" /><span className="font-bold text-sm">{(apt.doctors as any)?.full_name ?? '—'}</span></div>
              </div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 text-center flex-shrink-0">
              <p className="text-5xl font-black leading-none mb-1">{new Date(apt.scheduled_at).getDate()}</p>
              <p className="text-xs font-bold text-cyan-100 uppercase tracking-widest">{new Date(apt.scheduled_at).toLocaleDateString('id-ID',{month:'short'})}</p>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-white/20 flex gap-3">
            <button className="flex-1 bg-white text-primary rounded-xl py-3 font-bold text-sm hover:bg-cyan-50 transition-colors">Lihat Detail</button>
            <button className="flex-1 bg-white/20 text-white rounded-xl py-3 font-bold text-sm hover:bg-white/30 transition-colors">Reschedule</button>
          </div>
        </div>
      ) : (
        <div className="rounded-3xl p-8 text-white shadow-xl" style={{ background:'linear-gradient(135deg, #0C2340, #0891B2)' }}>
          <p className="text-xs uppercase tracking-widest font-bold mb-2 text-cyan-100">Appointment</p>
          <h2 className="text-2xl font-black mb-3">Belum ada jadwal</h2>
          <p className="text-white/70 text-sm mb-5">Buat appointment dengan dokter pilihan Anda</p>
          <Link href="/patient/booking" className="inline-flex items-center gap-2 px-5 py-3 bg-white text-primary rounded-xl font-bold text-sm hover:bg-cyan-50 transition-colors">
            <Calendar size={16} /> Buat Appointment
          </Link>
        </div>
      )}

      {/* Health summary + last visit */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h3 className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-4">Ringkasan Kesehatan</h3>
          {last ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between"><span className="text-sm font-bold text-secondary">Tekanan Darah</span><span className="text-sm font-bold text-success">{last.blood_pressure_sys}/{last.blood_pressure_dia} mmHg</span></div>
              <div className="flex items-center justify-between"><span className="text-sm font-bold text-secondary">Berat Badan</span><span className="text-sm font-bold text-primary">{last.weight ?? '—'} kg</span></div>
              <div className="flex items-center justify-between"><span className="text-sm font-bold text-secondary">Golongan Darah</span><span className="text-sm font-bold text-destructive">{patientRec?.blood_type ?? '—'}</span></div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Belum ada data rekam medis</p>
          )}
        </div>
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h3 className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-4">Kunjungan Terakhir</h3>
          {last ? (
            <div className="space-y-2">
              <p className="text-sm font-black text-secondary">{new Date(last.created_at).toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'})}</p>
              <p className="text-xs text-muted-foreground">{(last.doctors as any)?.full_name ?? '—'}</p>
              {last.diagnoses?.length > 0 && (
                <div className="pt-3 border-t border-gray-100">
                  <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-1">Diagnosis</p>
                  <p className="text-sm font-bold text-secondary">{last.diagnoses[0]}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Belum ada riwayat kunjungan</p>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/patient/booking" className="bg-primary text-white rounded-2xl p-6 hover:bg-primary-hover transition-colors group block">
          <div className="flex items-center justify-between">
            <div><Calendar size={28} className="mb-3" /><h3 className="text-lg font-black mb-1">Buat Appointment</h3><p className="text-sm text-cyan-100">Jadwalkan kunjungan Anda</p></div>
            <span className="text-3xl group-hover:translate-x-1 transition-transform">→</span>
          </div>
        </Link>
        <Link href="/patient/records" className="bg-white border border-gray-200 rounded-2xl p-6 hover:border-primary hover:shadow-md transition-all group block">
          <div className="flex items-center justify-between">
            <div><FileText size={28} className="mb-3 text-primary" /><h3 className="text-lg font-black text-secondary mb-1">Rekam Medis</h3><p className="text-sm text-muted-foreground">Lihat riwayat kesehatan</p></div>
            <span className="text-3xl text-primary group-hover:translate-x-1 transition-transform">→</span>
          </div>
        </Link>
      </div>
    </div>
  )
}
