import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/** Statuses a patient is still allowed to change (not yet seen / cancelled). */
const MUTABLE_STATUSES = ['menunggu', 'dikonfirmasi']

async function getPatientInfo() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const db = createAdminClient()
  const { data: profile } = await db.from('users').select('clinic_id, role').eq('id', user.id).single()
  if (!profile || profile.role !== 'patient') return null

  const { data: patient } = await db
    .from('patients')
    .select('id')
    .eq('user_id', user.id)
    .eq('clinic_id', profile.clinic_id)
    .single()

  return { clinicId: profile.clinic_id as string, patientId: patient?.id as string | undefined }
}

/** Load an appointment that belongs to this patient and is still mutable + upcoming. */
async function loadOwnedAppointment(
  db: ReturnType<typeof createAdminClient>,
  id: string,
  clinicId: string,
  patientId: string,
) {
  const { data: apt } = await db
    .from('appointments')
    .select('id, doctor_id, scheduled_at, status')
    .eq('id', id)
    .eq('clinic_id', clinicId)
    .eq('patient_id', patientId)
    .single()
  return apt
}

// ─── Reschedule ──────────────────────────────────────────────────────────────
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const info = await getPatientInfo()
  if (!info?.patientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { scheduled_at } = await request.json() as { scheduled_at?: string }
  if (!scheduled_at) return NextResponse.json({ error: 'scheduled_at wajib' }, { status: 400 })

  const newDate = new Date(scheduled_at)
  if (isNaN(newDate.getTime()) || newDate <= new Date()) {
    return NextResponse.json({ error: 'Jadwal baru harus di masa depan' }, { status: 400 })
  }

  const db = createAdminClient()
  const apt = await loadOwnedAppointment(db, id, info.clinicId, info.patientId)
  if (!apt) return NextResponse.json({ error: 'Janji temu tidak ditemukan' }, { status: 404 })
  if (!MUTABLE_STATUSES.includes(apt.status)) {
    return NextResponse.json({ error: 'Janji temu ini tidak bisa dijadwalkan ulang' }, { status: 409 })
  }

  // Slot conflict re-check (exclude this appointment + cancelled ones)
  const { data: clash } = await db
    .from('appointments')
    .select('id')
    .eq('clinic_id', info.clinicId)
    .eq('doctor_id', apt.doctor_id)
    .eq('scheduled_at', newDate.toISOString())
    .neq('status', 'batal')
    .neq('id', id)
    .maybeSingle()
  if (clash) {
    return NextResponse.json({ error: 'Slot tersebut sudah dipesan. Silakan pilih waktu lain.' }, { status: 409 })
  }

  // Recompute queue number for the target day
  const dateStr  = newDate.toISOString().split('T')[0]
  const dayStart = new Date(dateStr + 'T00:00:00.000Z').toISOString()
  const dayEnd   = new Date(dateStr + 'T23:59:59.999Z').toISOString()
  const { count } = await db.from('appointments')
    .select('*', { count: 'exact', head: true })
    .eq('clinic_id', info.clinicId)
    .eq('doctor_id', apt.doctor_id)
    .gte('scheduled_at', dayStart)
    .lte('scheduled_at', dayEnd)
    .neq('status', 'batal')
    .neq('id', id)

  const { error } = await db
    .from('appointments')
    .update({
      scheduled_at: newDate.toISOString(),
      queue_number: (count ?? 0) + 1,
      status: 'menunggu', // back to pending so the clinic re-confirms the new slot
    })
    .eq('id', id)
    .eq('clinic_id', info.clinicId)
    .eq('patient_id', info.patientId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

// ─── Cancel ──────────────────────────────────────────────────────────────────
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const info = await getPatientInfo()
  if (!info?.patientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const db = createAdminClient()

  const apt = await loadOwnedAppointment(db, id, info.clinicId, info.patientId)
  if (!apt) return NextResponse.json({ error: 'Janji temu tidak ditemukan' }, { status: 404 })
  if (!MUTABLE_STATUSES.includes(apt.status)) {
    return NextResponse.json({ error: 'Janji temu ini tidak bisa dibatalkan' }, { status: 409 })
  }

  const { error } = await db
    .from('appointments')
    .update({ status: 'batal' })
    .eq('id', id)
    .eq('clinic_id', info.clinicId)
    .eq('patient_id', info.patientId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Refund a package session if this appointment drew one down (no-op otherwise).
  await db.rpc('release_package_session', { p_appointment_id: id, p_clinic_id: info.clinicId })

  return NextResponse.json({ success: true })
}
