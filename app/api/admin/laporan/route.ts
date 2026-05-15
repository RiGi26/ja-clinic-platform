import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

async function getClinicId() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const db = createAdminClient()
  const { data } = await db.from('users').select('clinic_id').eq('id', user.id).single()
  return data?.clinic_id ?? null
}

export async function GET(request: Request) {
  const clinicId = await getClinicId()
  if (!clinicId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('mode') ?? 'today' // today | month

  const db  = createAdminClient()
  const now = new Date()

  let start: string, end: string
  if (mode === 'month') {
    start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    end   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()
  } else {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    end   = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString()
  }

  const [
    { data: apts },
    { data: bills },
    { data: doctors },
  ] = await Promise.all([
    db.from('appointments')
      .select('status, type, doctor_id, doctors(full_name, specialty)')
      .eq('clinic_id', clinicId)
      .gte('scheduled_at', start)
      .lt('scheduled_at', end),
    db.from('billing')
      .select('total, status, payment_method, created_at')
      .eq('clinic_id', clinicId)
      .gte('created_at', start)
      .lt('created_at', end),
    db.from('doctors')
      .select('id, full_name, specialty')
      .eq('clinic_id', clinicId)
      .eq('is_active', true),
  ])

  const aptList  = (apts  ?? []) as any[]
  const billList = (bills ?? []) as any[]

  const totalPasien    = aptList.length
  const selesai        = aptList.filter(a => a.status === 'selesai').length
  const batal          = aptList.filter(a => a.status === 'batal').length
  const menunggu       = aptList.filter(a => a.status === 'menunggu').length
  const walkin         = aptList.filter(a => a.type === 'walkin').length
  const booking        = aptList.filter(a => a.type === 'booking').length
  const revenue        = billList.filter(b => b.status === 'paid').reduce((s, b) => s + (b.total ?? 0), 0)
  const revenuePending = billList.filter(b => b.status === 'pending').reduce((s, b) => s + (b.total ?? 0), 0)

  // Revenue per payment method
  const byPayment = billList.filter(b => b.status === 'paid').reduce((acc: Record<string, number>, b) => {
    const method = b.payment_method ?? 'lainnya'
    acc[method] = (acc[method] ?? 0) + (b.total ?? 0)
    return acc
  }, {})

  // Per dokter stats
  const byDoctor = (doctors ?? []).map(doc => {
    const docApts = aptList.filter(a => a.doctor_id === doc.id)
    return {
      doctor_id   : doc.id,
      full_name   : doc.full_name,
      specialty   : doc.specialty,
      total       : docApts.length,
      selesai     : docApts.filter(a => a.status === 'selesai').length,
      menunggu    : docApts.filter(a => a.status === 'menunggu').length,
    }
  })

  return NextResponse.json({
    mode,
    period_start : start,
    period_end   : end,
    totalPasien,
    selesai,
    batal,
    menunggu,
    walkin,
    booking,
    revenue,
    revenuePending,
    byPayment,
    byDoctor,
  })
}
