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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const clinicId = await getClinicId()
  if (!clinicId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json() as {
    name?: string; category?: string; price?: number; description?: string; is_active?: boolean
  }

  const updates: Record<string, unknown> = {}
  if (body.name !== undefined)        updates.name        = body.name.trim()
  if (body.category !== undefined)    updates.category    = body.category
  if (body.price !== undefined)       updates.price       = body.price
  if (body.description !== undefined) updates.description = body.description?.trim() || null
  if (body.is_active !== undefined)   updates.is_active   = body.is_active

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Tidak ada field yang diupdate' }, { status: 400 })
  }

  const db = createAdminClient()
  const { error } = await db
    .from('treatments')
    .update(updates)
    .eq('id', id)
    .eq('clinic_id', clinicId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const clinicId = await getClinicId()
  if (!clinicId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const db = createAdminClient()

  // Soft delete — set is_active = false
  const { error } = await db
    .from('treatments')
    .update({ is_active: false })
    .eq('id', id)
    .eq('clinic_id', clinicId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
