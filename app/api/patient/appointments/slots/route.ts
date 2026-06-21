import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

function generateSlots(): string[] {
  const slots: string[] = []
  for (let h = 8; h < 17; h++) {
    slots.push(`${String(h).padStart(2, '0')}:00`)
    slots.push(`${String(h).padStart(2, '0')}:30`)
  }
  return slots
}

async function getPatientClinic() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const db = createAdminClient()
  const { data: profile } = await db.from('users').select('clinic_id, role').eq('id', user.id).single()
  if (!profile || profile.role !== 'patient') return null
  return profile.clinic_id as string
}

export async function GET(request: Request) {
  const clinicId = await getPatientClinic()
  if (!clinicId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const doctorId = searchParams.get('doctor_id')
  const date     = searchParams.get('date')
  if (!doctorId || !date) {
    return NextResponse.json({ error: 'doctor_id dan date wajib' }, { status: 400 })
  }

  const db = createAdminClient()

  const [year, month, day] = date.split('-').map(Number)
  const dayStart = new Date(year, month - 1, day, 0, 0, 0).toISOString()
  const dayEnd   = new Date(year, month - 1, day, 23, 59, 59).toISOString()

  const { data: appointments } = await db
    .from('appointments')
    .select('scheduled_at')
    .eq('clinic_id', clinicId)
    .eq('doctor_id', doctorId)
    .gte('scheduled_at', dayStart)
    .lte('scheduled_at', dayEnd)
    .neq('status', 'batal')

  const bookedTimes = new Set(
    (appointments ?? []).map((a: { scheduled_at: string }) => {
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
