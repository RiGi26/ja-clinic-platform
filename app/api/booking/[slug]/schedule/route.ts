import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// ============================================================
// Jadwal publik untuk landing page klien (WB klinik-fisio):
// jadwal praktik mingguan per dokter (doctor_schedules) + ketersediaan
// "hari ini" (slot kosong berikutnya, dihitung dari appointments).
// Read-only, tanpa data pasien. "Hari ini" dihitung dalam WIB karena
// fungsi Vercel berjalan di UTC.
// ============================================================

// Jam default bila dokter belum punya baris doctor_schedules —
// sama dengan generateSlots() di route slots (08:00–17:00).
const DEFAULT_START = '08:00'
const DEFAULT_END = '17:00'

const pad = (n: number) => String(n).padStart(2, '0')
const hhmm = (t: string) => t.slice(0, 5)
const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))

// step = clinics.booking_slot_minutes (30 = perilaku lama; fisio pakai 60).
function slotTimes(start: string, end: string, step: number): string[] {
  const out: string[] = []
  for (let m = toMin(start); m < toMin(end); m += step) {
    out.push(`${pad(Math.floor(m / 60))}:${pad(m % 60)}`)
  }
  return out
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const db = createAdminClient()

  const { data: link } = await db
    .from('booking_links')
    .select('clinic_id, is_active, clinics(booking_slot_minutes)')
    .eq('slug', slug)
    .single()

  if (!link?.is_active) return NextResponse.json({ error: 'Link tidak aktif' }, { status: 404 })

  const slotStep = (link.clinics as any)?.booking_slot_minutes ?? 30

  // "Hari ini" versi WIB (UTC+7) — pengunjung situs ada di Indonesia.
  const wib = new Date(Date.now() + 7 * 3600_000)
  const year = wib.getUTCFullYear()
  const month = wib.getUTCMonth() + 1
  const day = wib.getUTCDate()
  const dayOfWeek = wib.getUTCDay() // 0=Minggu … 6=Sabtu, sama dengan doctor_schedules
  const dateStr = `${year}-${pad(month)}-${pad(day)}`
  const nowMin = wib.getUTCHours() * 60 + wib.getUTCMinutes()

  const [{ data: doctors }, { data: locations }, { data: schedules }] = await Promise.all([
    db
      .from('doctors')
      .select('id, full_name, specialty, location_id')
      .eq('clinic_id', link.clinic_id)
      .eq('is_active', true)
      .order('full_name'),
    db
      .from('locations')
      .select('id, name, address')
      .eq('clinic_id', link.clinic_id)
      .eq('is_active', true)
      .order('created_at', { ascending: true }),
    db
      .from('doctor_schedules')
      .select('doctor_id, day_of_week, start_time, end_time')
      .eq('clinic_id', link.clinic_id)
      .eq('is_active', true)
      .order('day_of_week'),
  ])

  // Slot terbooking hari ini — konvensi tanggal sama dengan route slots/submit
  // (Date naive server) supaya hasilnya konsisten dengan wizard booking.
  const dayStart = new Date(year, month - 1, day, 0, 0, 0).toISOString()
  const dayEnd = new Date(year, month - 1, day, 23, 59, 59).toISOString()
  const { data: appointments } = await db
    .from('appointments')
    .select('doctor_id, scheduled_at')
    .eq('clinic_id', link.clinic_id)
    .gte('scheduled_at', dayStart)
    .lte('scheduled_at', dayEnd)
    .neq('status', 'batal')

  const bookedByDoctor = new Map<string, Set<string>>()
  for (const a of appointments ?? []) {
    const d = new Date(a.scheduled_at)
    const t = `${pad(d.getHours())}:${pad(d.getMinutes())}`
    if (!bookedByDoctor.has(a.doctor_id)) bookedByDoctor.set(a.doctor_id, new Set())
    bookedByDoctor.get(a.doctor_id)!.add(t)
  }

  const locationName = new Map((locations ?? []).map(l => [l.id, l.name]))
  const schedByDoctor = new Map<string, { day_of_week: number; start: string; end: string }[]>()
  for (const s of schedules ?? []) {
    if (!schedByDoctor.has(s.doctor_id)) schedByDoctor.set(s.doctor_id, [])
    schedByDoctor.get(s.doctor_id)!.push({
      day_of_week: s.day_of_week,
      start: hhmm(s.start_time),
      end: hhmm(s.end_time),
    })
  }

  const result = (doctors ?? []).map(doc => {
    // Tanpa baris jadwal → sintesis default engine slots (Senin–Sabtu
    // 08:00–17:00) supaya landing tidak mengklaim beda dari wizard booking.
    const weekly = schedByDoctor.get(doc.id)
      ?? [1, 2, 3, 4, 5, 6].map(d => ({ day_of_week: d, start: DEFAULT_START, end: DEFAULT_END }))
    const todayRow = weekly.find(w => w.day_of_week === dayOfWeek) ?? null

    let today: null | { start: string; end: string; free: number; next: string[] } = null
    if (todayRow) {
      const booked = bookedByDoctor.get(doc.id) ?? new Set<string>()
      const free = slotTimes(todayRow.start, todayRow.end, slotStep).filter(
        t => !booked.has(t) && toMin(t) > nowMin,
      )
      today = { start: todayRow.start, end: todayRow.end, free: free.length, next: free.slice(0, 4) }
    }

    return {
      id: doc.id,
      full_name: doc.full_name,
      specialty: doc.specialty,
      location_id: doc.location_id,
      location_name: locationName.get(doc.location_id) ?? null,
      weekly,
      today,
    }
  })

  return NextResponse.json({
    date: dateStr,
    day_of_week: dayOfWeek,
    doctors: result,
    locations: locations ?? [],
  })
}
