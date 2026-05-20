import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { renderToBuffer, type DocumentProps } from '@react-pdf/renderer'
import { PrescriptionDocument, type PrescriptionData } from '@/lib/prescription-pdf'
import React from 'react'

export const dynamic = 'force-dynamic'

async function getClinicId() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const db = createAdminClient()
  const { data } = await db.from('users').select('clinic_id, role').eq('id', user.id).single()
  if (!data?.clinic_id || !['admin', 'doctor'].includes(data.role)) return null
  return data.clinic_id as string
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const clinicId = await getClinicId()
  if (!clinicId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const db = createAdminClient()

  const { data: prescription } = await db
    .from('prescriptions')
    .select(`
      id, prescription_number, notes, created_at,
      patients(full_name, no_rm, date_of_birth),
      clinics(name, address, phone, logo_url),
      prescription_items(
        quantity, dosage, duration, notes,
        medicines(name, unit)
      )
    `)
    .eq('id', id)
    .eq('clinic_id', clinicId)
    .single()

  if (!prescription) return NextResponse.json({ error: 'Resep tidak ditemukan' }, { status: 404 })

  // Get doctor name from doctor_id (auth user id → users table → doctors table)
  const { data: pres_with_doctor } = await db
    .from('prescriptions')
    .select('doctor_id')
    .eq('id', id)
    .single()

  let doctorName = 'Dokter'
  let licenseNumber: string | null = null
  if (pres_with_doctor?.doctor_id) {
    const { data: doctorUser } = await db
      .from('doctors')
      .select('full_name, license_number')
      .eq('user_id', pres_with_doctor.doctor_id)
      .eq('clinic_id', clinicId)
      .single()
    if (doctorUser) { doctorName = doctorUser.full_name; licenseNumber = doctorUser.license_number ?? null }
  }

  const patient = prescription.patients as any
  const clinic  = prescription.clinics  as any
  const items   = (prescription.prescription_items as any[]).map(item => ({
    medicine_name: item.medicines?.name ?? '',
    quantity:      item.quantity,
    unit:          item.medicines?.unit ?? '',
    dosage:        item.dosage,
    duration:      item.duration ?? null,
    notes:         item.notes ?? null,
  }))

  const pdfData: PrescriptionData = {
    prescriptionNumber: prescription.prescription_number ?? prescription.id.slice(-8),
    createdAt:          prescription.created_at,
    patient:            { full_name: patient?.full_name ?? '', no_rm: patient?.no_rm ?? '', date_of_birth: patient?.date_of_birth ?? null },
    doctor:             { full_name: doctorName, license_number: licenseNumber },
    clinic:             { name: clinic?.name ?? '', address: clinic?.address ?? null, phone: clinic?.phone ?? null, logo_url: clinic?.logo_url ?? null },
    items,
    notes:              prescription.notes ?? null,
  }

  const element = React.createElement(PrescriptionDocument, { data: pdfData }) as unknown as React.ReactElement<DocumentProps>
  const buffer  = await renderToBuffer(element)

  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${pdfData.prescriptionNumber}.pdf"`,
    },
  })
}
