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

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const clinicId = await getAdminClinicId()
  if (!clinicId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const db = createAdminClient()

  const [{ data: medicine }, { data: transactions }] = await Promise.all([
    db.from('medicines').select('*').eq('id', id).eq('clinic_id', clinicId).single(),
    db.from('medicine_transactions')
      .select('*').eq('medicine_id', id).eq('clinic_id', clinicId)
      .order('created_at', { ascending: false }).limit(20),
  ])

  if (!medicine) return NextResponse.json({ error: 'Obat tidak ditemukan' }, { status: 404 })
  return NextResponse.json({ medicine, transactions: transactions ?? [] })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const clinicId = await getAdminClinicId()
  if (!clinicId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id }  = await params
  const body     = await request.json() as {
    type?: 'masuk' | 'keluar' | 'adjustment'
    quantity?: number; reference?: string; notes?: string
    name?: string; min_stock?: number; price?: number; is_active?: boolean
  }

  const db = createAdminClient()

  // Atomic stock movement (if requested): locks the medicine row, guards against
  // negative stock, writes medicines + ledger in one tx. Replaces the former
  // read-then-write that raced on medicines.stock.
  if (body.type && body.quantity !== undefined) {
    const { data: result, error } = await db.rpc('adjust_medicine_stock', {
      p_medicine_id: id,
      p_clinic_id:   clinicId,
      p_type:        body.type,
      p_quantity:    body.quantity,
      p_reference:   body.reference ?? null,
      p_notes:       body.notes ?? null,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const r = (result ?? {}) as { ok: boolean; code?: string }
    if (!r.ok) {
      if (r.code === 'not_found')    return NextResponse.json({ error: 'Obat tidak ditemukan' }, { status: 404 })
      if (r.code === 'insufficient') return NextResponse.json({ error: 'Stok tidak mencukupi' }, { status: 400 })
      return NextResponse.json({ error: 'Gagal memperbarui stok' }, { status: 400 })
    }
  }

  // Non-stock field updates (not subject to the stock race)
  const updates: Record<string, unknown> = {}
  if (body.name      !== undefined) updates.name      = body.name
  if (body.min_stock !== undefined) updates.min_stock = body.min_stock
  if (body.price     !== undefined) updates.price     = body.price
  if (body.is_active !== undefined) updates.is_active = body.is_active

  if (Object.keys(updates).length > 0) {
    const { data: exists } = await db.from('medicines').select('id').eq('id', id).eq('clinic_id', clinicId).single()
    if (!exists) return NextResponse.json({ error: 'Obat tidak ditemukan' }, { status: 404 })
    const { error } = await db.from('medicines').update(updates).eq('id', id).eq('clinic_id', clinicId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const clinicId = await getAdminClinicId()
  if (!clinicId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const db = createAdminClient()
  await db.from('medicines').update({ is_active: false }).eq('id', id).eq('clinic_id', clinicId)
  return NextResponse.json({ success: true })
}
