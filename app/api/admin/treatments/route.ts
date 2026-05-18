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
  const category   = searchParams.get('category')
  const activeOnly = searchParams.get('active') === 'true'

  const db = createAdminClient()
  let query = db
    .from('treatments')
    .select('id, name, category, price, description, is_active, created_at')
    .eq('clinic_id', clinicId)
    .order('category')
    .order('name')

  if (category) query = query.eq('category', category)
  if (activeOnly) query = query.eq('is_active', true)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ treatments: data ?? [] })
}

const VALID_CATEGORIES = ['umum', 'tindakan', 'laboratorium', 'obat', 'lainnya'] as const
type Category = typeof VALID_CATEGORIES[number]

export async function POST(request: Request) {
  const clinicId = await getClinicId()
  if (!clinicId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as {
    name?: string; category?: string; price?: number; description?: string
  }

  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'Nama tindakan wajib diisi' }, { status: 400 })
  }
  if (typeof body.price !== 'number' || body.price < 0) {
    return NextResponse.json({ error: 'Harga harus angka >= 0' }, { status: 400 })
  }
  if (body.category && !VALID_CATEGORIES.includes(body.category as Category)) {
    return NextResponse.json({ error: 'Kategori tidak valid' }, { status: 400 })
  }

  const db = createAdminClient()
  const { data, error } = await db
    .from('treatments')
    .insert({
      clinic_id:   clinicId,
      name:        body.name.trim(),
      category:    (body.category as Category) ?? 'umum',
      price:       body.price,
      description: body.description?.trim() || null,
    })
    .select('id, name, category, price, description, is_active')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ treatment: data }, { status: 201 })
}
