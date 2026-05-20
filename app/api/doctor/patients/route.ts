import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createAdminClient()
  const { data: profile } = await db
    .from('users')
    .select('clinic_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.clinic_id || profile.role !== 'doctor') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: doctorRec } = await db
    .from('doctors')
    .select('id')
    .eq('user_id', user.id)
    .eq('clinic_id', profile.clinic_id)
    .single()

  if (!doctorRec) return NextResponse.json({ patients: [] })

  // Ambil semua appointment selesai oleh dokter ini, group by patient
  const { data: apts } = await db
    .from('appointments')
    .select('patient_id, scheduled_at, patients(id, full_name, no_rm, phone)')
    .eq('clinic_id', profile.clinic_id)
    .eq('doctor_id', doctorRec.id)
    .eq('status', 'selesai')
    .order('scheduled_at', { ascending: false })

  if (!apts) return NextResponse.json({ patients: [] })

  // Group by patient_id
  const patientMap = new Map<string, {
    patient_id       : string
    full_name        : string
    no_rm            : string
    phone            : string | null
    total_kunjungan  : number
    kunjungan_terakhir: string
  }>()

  for (const apt of apts) {
    const p = apt.patients as any
    if (!p?.id) continue
    if (patientMap.has(p.id)) {
      patientMap.get(p.id)!.total_kunjungan += 1
    } else {
      patientMap.set(p.id, {
        patient_id        : p.id,
        full_name         : p.full_name,
        no_rm             : p.no_rm,
        phone             : p.phone ?? null,
        total_kunjungan   : 1,
        kunjungan_terakhir: apt.scheduled_at,
      })
    }
  }

  const patients = [...patientMap.values()].sort((a, b) =>
    new Date(b.kunjungan_terakhir).getTime() - new Date(a.kunjungan_terakhir).getTime()
  )

  return NextResponse.json({ patients })
}
