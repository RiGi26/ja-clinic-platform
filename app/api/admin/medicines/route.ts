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
  const gate = await guardEntitlementApi(clinicId, 'pharmacy'); if (gate) return gate

  const { searchParams } = new URL(request.url)
  const search   = searchParams.get('search')
  const category = searchParams.get('category')
  const lowStock = searchParams.get('low_stock') === 'true'

  const db = createAdminClient()
  let q = db.from('medicines').select('*').eq('clinic_id', clinicId).eq('is_active', true).order('name')

  if (search)   q = q.ilike('name', `%${search}%`)
  if (category) q = q.eq('category', category)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const all      = data ?? []
  const list     = lowStock ? all.filter((m: any) => m.stock <= m.min_stock) : all
  const lowCount = all.filter((m: any) => m.stock <= m.min_stock).length

  return NextResponse.json({ data: list, low_stock_count: lowCount })
}

export async function POST(request: Request) {
  const clinicId = await getAdminClinicId()
  if (!clinicId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const gate = await guardEntitlementApi(clinicId, 'pharmacy'); if (gate) return gate

  const body = await request.json() as {
    name: string; generic_name?: string; category?: string; unit?: string
    stock?: number; min_stock?: number; price?: number; description?: string
  }

  if (!body.name?.trim()) return NextResponse.json({ error: 'Nama obat wajib diisi' }, { status: 400 })

  const db    = createAdminClient()
  const stock = body.stock ?? 0

  const { data: medicine, error } = await db.from('medicines').insert({
    clinic_id:    clinicId,
    name:         body.name.trim(),
    generic_name: body.generic_name?.trim() || null,
    category:     body.category ?? 'obat',
    unit:         body.unit ?? 'tablet',
    stock,
    min_stock:    body.min_stock ?? 10,
    price:        body.price ?? 0,
    description:  body.description?.trim() || null,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (stock > 0) {
    await db.from('medicine_transactions').insert({
      clinic_id: clinicId, medicine_id: medicine.id,
      type: 'masuk', quantity: stock, stock_before: 0, stock_after: stock, notes: 'Stok awal',
    })
  }

  return NextResponse.json({ success: true, data: medicine })
}
