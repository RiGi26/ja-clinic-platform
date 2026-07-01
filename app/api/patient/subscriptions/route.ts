import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// PostgREST returns a to-one embed as an object at runtime, but supabase-js types
// it as an array — normalize either shape.
function relOne<T>(rel: unknown): T | null {
  return ((Array.isArray(rel) ? rel[0] : rel) ?? null) as T | null
}

async function getPatientInfo() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const db = createAdminClient()
  const { data: profile } = await db.from('users').select('clinic_id, role').eq('id', user.id).single()
  if (!profile || profile.role !== 'patient') return null
  const { data: patient } = await db
    .from('patients').select('id').eq('user_id', user.id).eq('clinic_id', profile.clinic_id).single()
  return { clinicId: profile.clinic_id as string, patientId: patient?.id as string | undefined }
}

// GET /api/patient/subscriptions — the logged-in patient's usable packages
// (active, sessions left, not expired). Used by the booking flow + "Paket Saya".
export async function GET() {
  const info = await getPatientInfo()
  if (!info?.patientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createAdminClient()
  const { data, error } = await db
    .from('patient_package_subscriptions')
    .select('id, sessions_total, sessions_remaining, expires_at, purchased_at, service_packages(name)')
    .eq('clinic_id', info.clinicId)
    .eq('patient_id', info.patientId)
    .eq('status', 'active')
    .gt('sessions_remaining', 0)
    .order('purchased_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const nowMs = Date.now()
  const subscriptions = (data ?? [])
    .filter(s => !s.expires_at || new Date(s.expires_at).getTime() > nowMs)
    .map(s => ({
      id: s.id,
      sessions_total: s.sessions_total,
      sessions_remaining: s.sessions_remaining,
      expires_at: s.expires_at,
      package_name: relOne<{ name: string }>(s.service_packages)?.name ?? 'Paket',
    }))
  return NextResponse.json({ subscriptions })
}
