import { redirect } from 'next/navigation'
import { getClinicUser } from '@/lib/clinic'
import { createAdminClient } from '@/lib/supabase/server'
import TopBar from '@/components/TopBar'
import PrescriptionForm from '@/components/PrescriptionForm'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function AppointmentPrescriptionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await getClinicUser()
  if (user.role !== 'doctor') redirect('/auth/login')

  const db = createAdminClient()
  const { data: apt } = await db
    .from('appointments')
    .select('id, status, scheduled_at, complaint, patients(id, full_name, no_rm), doctors(id, full_name)')
    .eq('id', id)
    .eq('clinic_id', user.clinic_id)
    .single()

  if (!apt) redirect('/doctor')

  const patient = apt.patients as any
  const doctor  = apt.doctors  as any

  const fmtDateTime = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(apt.scheduled_at))

  const showPrescription = ['diperiksa', 'selesai'].includes(apt.status)

  return (
    <div className="min-h-screen bg-background">
      <TopBar title="Resep Obat" subtitle={patient?.full_name} showSearch={false} />
      <div className="p-6 lg:p-8 max-w-2xl mx-auto">
        <Link href="/doctor/records" className="text-sm font-bold text-muted-foreground hover:text-secondary mb-5 inline-block transition-colors">
          ← Kembali ke Rekam Medis
        </Link>

        {/* Appointment info */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              ['Pasien',   patient?.full_name ?? '—'],
              ['No. RM',   patient?.no_rm ?? '—'],
              ['Dokter',   doctor?.full_name ? `dr. ${doctor.full_name}` : '—'],
              ['Jadwal',   fmtDateTime],
              ['Keluhan',  apt.complaint ?? '—'],
              ['Status',   apt.status],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-0.5">{label}</p>
                <p className="font-bold text-gray-800">{value}</p>
              </div>
            ))}
          </div>
        </div>

        {showPrescription ? (
          <PrescriptionForm
            appointmentId={id}
            patientId={patient?.id ?? ''}
          />
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center text-muted-foreground text-sm">
            Resep hanya bisa dibuat saat pasien sedang diperiksa atau sudah selesai.
            <br />
            <Link href={`/doctor/records?apt=${id}`} className="text-primary font-bold mt-2 inline-block hover:underline">
              Buka form SOAP →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
