import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

function generateSlots(): string[] {
  const slots: string[] = []
  for (let h = 8; h < 17; h++) {
    slots.push(`${String(h).padStart(2, '0')}:00`)
    slots.push(`${String(h).padStart(2, '0')}:30`)
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

  const slots = generateSlots().map(time => {
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
