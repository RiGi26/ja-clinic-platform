import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { InvoiceDocument, type BillingItem } from '@/lib/invoice-pdf'
import React from 'react'

export const dynamic = 'force-dynamic'

async function getClinicId() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const db = createAdminClient()
  const { data } = await db.from('users').select('clinic_id').eq('id', user.id).single()
  return data?.clinic_id ?? null
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const clinicId = await getClinicId()
  if (!clinicId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const db = createAdminClient()

  const { data: bill } = await db
    .from('billing')
    .select(`
      id, invoice_number, items, subtotal, discount, total,
      payment_method, status, created_at,
      patients ( full_name, no_rm ),
      clinics  ( name, address, phone, bank_name, bank_account, bank_holder, logo_url ),
      appointments (
        scheduled_at,
        doctors ( full_name )
      )
    `)
    .eq('id', id)
    .eq('clinic_id', clinicId)
    .single()

  if (!bill) return NextResponse.json({ error: 'Invoice tidak ditemukan' }, { status: 404 })

  const patient = bill.patients as { full_name: string; no_rm: string } | null
  const clinic  = bill.clinics  as {
    name: string; address: string | null; phone: string | null
    bank_name: string | null; bank_account: string | null; bank_holder: string | null; logo_url: string | null
  } | null
  const appt    = bill.appointments as { scheduled_at: string; doctors: { full_name: string } | null } | null

  if (!patient || !clinic) {
    return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 500 })
  }

  const items = (bill.items ?? []) as BillingItem[]

  const buffer = await renderToBuffer(
    React.createElement(InvoiceDocument, {
      data: {
        invoiceNumber: bill.invoice_number,
        createdAt:     bill.created_at,
        patient,
        clinic,
        doctor:      appt?.doctors ?? null,
        appointment: appt ? { scheduled_at: appt.scheduled_at } : null,
        items,
        subtotal:      bill.subtotal ?? 0,
        discount:      bill.discount ?? 0,
        total:         bill.total ?? 0,
        paymentMethod: bill.payment_method,
        status:        bill.status,
      },
    }),
  )

  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${bill.invoice_number}.pdf"`,
    },
  })
}
