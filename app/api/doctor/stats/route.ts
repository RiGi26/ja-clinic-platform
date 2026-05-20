import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

async function getDoctorContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const db = createAdminClient()
  const { data: profile } = await db
    .from('users')
    .select('clinic_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.clinic_id || profile.role !== 'doctor') return null

  const { data: doctorRec } = await db
    .from('doctors')
    .select('id')
    .eq('user_id', user.id)
    .eq('clinic_id', profile.clinic_id)
    .single()

  if (!doctorRec) return null
  return { clinicId: profile.clinic_id as string, doctorId: doctorRec.id as string }
}

export async function GET(request: Request) {
  const ctx = await getDoctorContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { clinicId, doctorId } = ctx
  const { searchParams } = new URL(request.url)

  // Default: bulan ini
  const now        = new Date()
  const monthParam = searchParams.get('month') ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const [yr, mo]   = monthParam.split('-').map(Number)

  const monthStart  = new Date(yr, mo - 1, 1).toISOString()
  const monthEnd    = new Date(yr, mo, 1).toISOString()
  const prevStart   = new Date(yr, mo - 2, 1).toISOString()
  const prevEnd     = monthStart

  const db = createAdminClient()

  // Query appointments bulan ini (selesai)
  const { data: thisMonthApts } = await db
    .from('appointments')
    .select('id, patient_id, complaint, scheduled_at')
    .eq('clinic_id', clinicId)
    .eq('doctor_id', doctorId)
    .eq('status', 'selesai')
    .gte('scheduled_at', monthStart)
    .lt('scheduled_at', monthEnd)

  // Query appointments bulan lalu (selesai)
  const { data: prevMonthApts } = await db
    .from('appointments')
    .select('id, patient_id')
    .eq('clinic_id', clinicId)
    .eq('doctor_id', doctorId)
    .eq('status', 'selesai')
    .gte('scheduled_at', prevStart)
    .lt('scheduled_at', prevEnd)

  // Seluruh riwayat patient_ids untuk dokter ini (sebelum bulan ini)
  const { data: allHistorical } = await db
    .from('appointments')
    .select('patient_id')
    .eq('clinic_id', clinicId)
    .eq('doctor_id', doctorId)
    .eq('status', 'selesai')
    .lt('scheduled_at', monthStart)

  const thisApts   = thisMonthApts ?? []
  const prevApts   = prevMonthApts ?? []
  const historical = allHistorical ?? []

  const historicalPatientIds = new Set(historical.map(a => a.patient_id))

  // Hitung pasien baru vs kembali
  const thisPatientIds = [...new Set(thisApts.map(a => a.patient_id))]
  const pasienBaru     = thisPatientIds.filter(id => !historicalPatientIds.has(id)).length
  const pasienKembali  = thisPatientIds.filter(id => historicalPatientIds.has(id)).length

  // Total resep bulan ini
  const aptIds = thisApts.map(a => a.id)
  let totalResep = 0
  if (aptIds.length > 0) {
    const { data: medRecs } = await db
      .from('medical_records')
      .select('id')
      .eq('clinic_id', clinicId)
      .eq('doctor_id', doctorId)
      .gte('created_at', monthStart)
      .lt('created_at', monthEnd)

    if (medRecs && medRecs.length > 0) {
      const mrIds = medRecs.map(r => r.id)
      const { count } = await db
        .from('prescriptions')
        .select('*', { count: 'exact', head: true })
        .in('medical_record_id', mrIds)
      totalResep = count ?? 0
    }
  }

  // Growth %
  const totalPasien     = thisApts.length
  const totalPasienLalu = prevApts.length
  const growthPct = totalPasienLalu > 0
    ? Math.round(((totalPasien - totalPasienLalu) / totalPasienLalu) * 100)
    : totalPasien > 0 ? 100 : 0

  // Top 5 keluhan
  const keluhanMap = new Map<string, number>()
  for (const apt of thisApts) {
    if (!apt.complaint) continue
    const key = apt.complaint.trim().toLowerCase()
    keluhanMap.set(key, (keluhanMap.get(key) ?? 0) + 1)
  }
  const topKeluhan = [...keluhanMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([keluhan, count]) => ({
      keluhan: keluhan.charAt(0).toUpperCase() + keluhan.slice(1),
      count,
    }))

  // Daily counts — semua hari dalam bulan (termasuk 0)
  const daysInMonth = new Date(yr, mo, 0).getDate()
  const dailyMap    = new Map<string, number>()
  for (const apt of thisApts) {
    const d = apt.scheduled_at.split('T')[0]
    dailyMap.set(d, (dailyMap.get(d) ?? 0) + 1)
  }
  const dailyCounts = Array.from({ length: daysInMonth }, (_, i) => {
    const day  = String(i + 1).padStart(2, '0')
    const date = `${yr}-${String(mo).padStart(2, '0')}-${day}`
    return { date, count: dailyMap.get(date) ?? 0 }
  })

  // Jam tersibuk
  const hourMap = new Map<number, number>()
  for (const apt of thisApts) {
    const h = new Date(apt.scheduled_at).getHours()
    hourMap.set(h, (hourMap.get(h) ?? 0) + 1)
  }
  let jamTersibuk = '-'
  if (hourMap.size > 0) {
    const peakHour = [...hourMap.entries()].sort((a, b) => b[1] - a[1])[0][0]
    jamTersibuk    = `${String(peakHour).padStart(2, '0')}:00-${String(peakHour + 1).padStart(2, '0')}:00`
  }

  return NextResponse.json({
    total_pasien     : totalPasien,
    pasien_baru      : pasienBaru,
    pasien_kembali   : pasienKembali,
    total_resep      : totalResep,
    total_pasien_lalu: totalPasienLalu,
    growth_pct       : growthPct,
    top_keluhan      : topKeluhan,
    daily_counts     : dailyCounts,
    jam_tersibuk     : jamTersibuk,
  })
}
