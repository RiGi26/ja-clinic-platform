import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { guardEntitlementApi } from '@/lib/clinic-entitlements'

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
  const gate = await guardEntitlementApi(clinicId, 'shifts'); if (gate) return gate

  const { searchParams } = new URL(request.url)
  const month  = searchParams.get('month') ?? new Date().toISOString().slice(0, 7)
  const userId = searchParams.get('user_id')

  const [year, mon] = month.split('-').map(Number)
  const firstDay = `${month}-01`
  const lastDay  = new Date(year, mon, 0).toISOString().split('T')[0]

  const db = createAdminClient()
  let q = db.from('staff_shifts')
    .select('*, users(full_name, role)')
    .eq('clinic_id', clinicId)
    .gte('date', firstDay)
    .lte('date', lastDay)
    .order('date')

  if (userId) q = q.eq('user_id', userId)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const shifts = data ?? []
  const summary = {
    total_staf: new Set(shifts.map((s: any) => s.user_id)).size,
    hadir: shifts.filter((s: any) => s.status === 'hadir').length,
    izin:  shifts.filter((s: any) => s.status === 'izin').length,
    sakit: shifts.filter((s: any) => s.status === 'sakit').length,
    alpha: shifts.filter((s: any) => s.status === 'alpha').length,
  }

  return NextResponse.json({ data: shifts, summary })
}

export async function POST(request: Request) {
  const clinicId = await getAdminClinicId()
  if (!clinicId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const gate = await guardEntitlementApi(clinicId, 'shifts'); if (gate) return gate

  const body = await request.json() as {
    user_id?: string; date?: string; shift?: string; status?: string; notes?: string
    month?: string
  }

  const db = createAdminClient()

  // Bulk generate from template
  if (body.month && !body.user_id) {
    const [year, mon] = body.month.split('-').map(Number)
    const daysInMonth = new Date(year, mon, 0).getDate()

    const { data: templates } = await db
      .from('shift_templates')
      .select('user_id, day_of_week, shift')
      .eq('clinic_id', clinicId)

    if (!templates?.length) return NextResponse.json({ generated: 0 })

    const records: object[] = []
    for (let d = 1; d <= daysInMonth; d++) {
      const date    = new Date(year, mon - 1, d)
      const dow     = date.getDay()
      const dateStr = date.toISOString().split('T')[0]
      for (const tmpl of templates) {
        if (tmpl.day_of_week === dow) {
          records.push({
            clinic_id: clinicId,
            user_id:   tmpl.user_id,
            date:      dateStr,
            shift:     tmpl.shift,
            status:    tmpl.shift === 'libur' ? 'libur' : 'hadir',
          })
        }
      }
    }

    if (records.length) {
      await db.from('staff_shifts').upsert(records, { onConflict: 'clinic_id,user_id,date', ignoreDuplicates: true })
    }
    return NextResponse.json({ generated: records.length })
  }

  // Single upsert
  if (!body.user_id || !body.date || !body.shift || !body.status) {
    return NextResponse.json({ error: 'user_id, date, shift, status wajib' }, { status: 400 })
  }

  const { data, error } = await db.from('staff_shifts').upsert({
    clinic_id: clinicId,
    user_id:   body.user_id,
    date:      body.date,
    shift:     body.shift,
    status:    body.status,
    notes:     body.notes ?? null,
  }, { onConflict: 'clinic_id,user_id,date' }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data })
}
