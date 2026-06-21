import { NextResponse } from 'next/server'
import { requireApiUser } from '@/lib/api-auth'
import { renderToBuffer, type DocumentProps } from '@react-pdf/renderer'
import { InvoiceDocument, type BillingItem } from '@/lib/invoice-pdf'
import React from 'react'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser({ roles: ['admin', 'receptionist'] })
  if (!auth.ok) return auth.res
  const { db, clinicId } = auth

  const { id } = await params

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

  const patient = bill.patients as unknown as { full_name: string; no_rm: string } | null
  const clinic  = bill.clinics  as unknown as {
    name: string; address: string | null; phone: string | null
    bank_name: string | null; bank_account: string | null; bank_holder: string | null; logo_url: string | null
  } | null
  const appt    = bill.appointments as unknown as { scheduled_at: string; doctors: { full_name: string } | null } | null

  if (!patient || !clinic) {
    return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 500 })
  }

  const items = (bill.items ?? []) as BillingItem[]

  const element = React.createElement(InvoiceDocument, {
    data: {
      invoiceNumber: bill.invoice_number,
      createdAt:     bill.created_at,
      patient:       patient!,
      clinic:        clinic!,
      doctor:        appt?.doctors ?? null,
      appointment:   appt ? { scheduled_at: appt.scheduled_at } : null,
      items,
      subtotal:      bill.subtotal ?? 0,
      discount:      bill.discount ?? 0,
      total:         bill.total ?? 0,
      paymentMethod: bill.payment_method,
      status:        bill.status,
    },
  }) as unknown as React.ReactElement<DocumentProps>

  const buffer = await renderToBuffer(element)

  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${bill.invoice_number}.pdf"`,
    },
  })
}
