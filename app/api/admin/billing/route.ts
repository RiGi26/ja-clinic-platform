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

type BillingItem = { name: string; qty: number; price: number; subtotal: number }

export async function POST(request: Request) {
  const clinicId = await getClinicId()
  if (!clinicId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as {
    patient_id: string
    appointment_id?: string
    items: BillingItem[]
    discount?: number
    notes?: string
  }

  if (!body.patient_id) {
    return NextResponse.json({ error: 'patient_id wajib diisi' }, { status: 400 })
  }
  if (!body.items || body.items.length === 0) {
    return NextResponse.json({ error: 'Minimal 1 item tagihan' }, { status: 400 })
  }

  const db = createAdminClient()

  // Generate invoice number via DB function
  const { data: invData } = await db.rpc('generate_invoice_number', { p_clinic_id: clinicId })
  const invoiceNumber = invData as string | null
  if (!invoiceNumber) {
    return NextResponse.json({ error: 'Gagal generate nomor invoice' }, { status: 500 })
  }

  const subtotal = body.items.reduce((sum, item) => sum + item.qty * item.price, 0)
  const discount = body.discount ?? 0
  const total    = subtotal - discount

  const { data: bill, error } = await db
    .from('billing')
    .insert({
      clinic_id:      clinicId,
      patient_id:     body.patient_id,
      appointment_id: body.appointment_id || null,
      invoice_number: invoiceNumber,
      items:          body.items,
      subtotal,
      discount,
      total,
      notes:          body.notes?.trim() || null,
      status:         'pending',
    })
    .select('id, invoice_number')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, bill }, { status: 201 })
}
