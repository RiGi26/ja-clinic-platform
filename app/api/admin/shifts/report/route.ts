import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

async function getAdminClinicId() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const db = createAdminClient()
  const { data } = await db.from('users').select('clinic_id, role').eq('id', user.id).single()
  if (!data?.clinic_id || data.role !== 'admin') return null
  return data.clinic_id as string
}

export async function GET(request: Request) {
  const clinicId = await getAdminClinicId()
  if (!clinicId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const month    = searchParams.get('month') ?? new Date().toISOString().slice(0, 7)
  const [year, mon] = month.split('-').map(Number)
  const firstDay = `${month}-01`
  const lastDay  = new Date(year, mon, 0).toISOString().split('T')[0]

  // Count non-Sunday days (Mon–Sat) in the month
  const daysInMonth = new Date(year, mon, 0).getDate()
  let workingDays = 0
  for (let d = 1; d <= daysInMonth; d++) {
    if (new Date(year, mon - 1, d).getDay() !== 0) workingDays++
  }

  const db = createAdminClient()
  const [{ data: staffList }, { data: shifts }] = await Promise.all([
    db.from('users')
      .select('id, full_name, role')
      .eq('clinic_id', clinicId)
      .in('role', ['admin', 'doctor', 'receptionist'])
      .eq('status', 'active'),
    db.from('staff_shifts')
      .select('user_id, shift, status')
      .eq('clinic_id', clinicId)
      .gte('date', firstDay)
      .lte('date', lastDay),
  ])

  const countsMap = new Map<string, { hadir: number; izin: number; sakit: number; alpha: number; pagi: number; siang: number; malam: number }>()
  for (const s of shifts ?? []) {
    const c = countsMap.get(s.user_id) ?? { hadir: 0, izin: 0, sakit: 0, alpha: 0, pagi: 0, siang: 0, malam: 0 }
    if (s.status === 'hadir') c.hadir++
    if (s.status === 'izin')  c.izin++
    if (s.status === 'sakit') c.sakit++
    if (s.status === 'alpha') c.alpha++
    if (s.shift === 'pagi')   c.pagi++
    if (s.shift === 'siang')  c.siang++
    if (s.shift === 'malam')  c.malam++
    countsMap.set(s.user_id, c)
  }

  const staff = (staffList ?? []).map(u => {
    const c     = countsMap.get(u.id) ?? { hadir: 0, izin: 0, sakit: 0, alpha: 0, pagi: 0, siang: 0, malam: 0 }
    const total = c.hadir + c.izin + c.sakit + c.alpha
    return {
      user_id: u.id, full_name: u.full_name, role: u.role, ...c,
      attendance_rate: total > 0 ? Math.round((c.hadir / total) * 100) : 0,
    }
  })

  return NextResponse.json({ month, working_days: workingDays, staff })
}
