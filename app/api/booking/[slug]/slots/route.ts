import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))
const pad = (n: number) => String(n).padStart(2, '0')

// Default 08:00–17:00 bila dokter belum punya baris doctor_schedules.
function generateSlots(start = '08:00', end = '17:00'): string[] {
  const slots: string[] = []
  for (let m = toMin(start); m < toMin(end); m += 30) {
    slots.push(`${pad(Math.floor(m / 60))}:${pad(m % 60)}`)
  }
  return slots
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const { searchParams } = new URL(request.url)
  const doctorId = searchParams.get('doctor_id')
  const date     = searchParams.get('date')

  if (!doctorId || !date) {
    return NextResponse.json({ error: 'doctor_id dan date wajib' }, { status: 400 })
  }

  const db = createAdminClient()

  const { data: link } = await db
    .from('booking_links')
    .select('clinic_id, is_active')
    .eq('slug', slug)
    .single()

  if (!link?.is_active) return NextResponse.json({ error: 'Link tidak aktif' }, { status: 404 })

  const [year, month, day] = date.split('-').map(Number)
  const dayStart = new Date(year, month - 1, day, 0, 0, 0).toISOString()
  const dayEnd   = new Date(year, month - 1, day, 23, 59, 59).toISOString()

  // Hormati jadwal praktik dokter bila di-set; tanpa baris jadwal → default
  // 08:00–17:00 tiap hari (perilaku lama, tenant lain tidak berubah).
  const { data: schedRows } = await db
    .from('doctor_schedules')
    .select('day_of_week, start_time, end_time')
    .eq('clinic_id', link.clinic_id)
    .eq('doctor_id', doctorId)
    .eq('is_active', true)

  let window: { start: string; end: string } | null = { start: '08:00', end: '17:00' }
  if (schedRows && schedRows.length > 0) {
    const dow = new Date(year, month - 1, day).getDay()
    const row = schedRows.find(r => r.day_of_week === dow)
    window = row ? { start: String(row.start_time).slice(0, 5), end: String(row.end_time).slice(0, 5) } : null
  }
  if (!window) return NextResponse.json({ slots: [] })

  const { data: appointments } = await db
    .from('appointments')
    .select('scheduled_at')
    .eq('clinic_id', link.clinic_id)
    .eq('doctor_id', doctorId)
    .gte('scheduled_at', dayStart)
    .lte('scheduled_at', dayEnd)
    .neq('status', 'batal')

  const bookedTimes = new Set(
    (appointments ?? []).map((a: any) => {
      const d = new Date(a.scheduled_at)
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    })
  )

  const now     = new Date()
  const isToday = date === now.toISOString().split('T')[0]

  const slots = generateSlots(window.start, window.end).map(time => {
    let available = !bookedTimes.has(time)
    if (isToday && available) {
      const [h, m] = time.split(':').map(Number)
      const slotDt = new Date(year, month - 1, day, h, m)
      if (slotDt <= now) available = false
    }
    return { time, available }
  })

  return NextResponse.json({ slots })
}
