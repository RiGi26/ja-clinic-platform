import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { renderToBuffer, type DocumentProps } from '@react-pdf/renderer'
import { MedicalLetterDocument, type LetterData } from '@/lib/medical-letter-pdf'
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

  const { data: letter } = await db
    .from('medical_letters')
    .select(`
      id, letter_number, type, diagnosis, notes, created_at,
      sick_days, sick_from, sick_until,
      referred_to, referral_reason, purpose,
      patients(full_name, no_rm, date_of_birth, gender, address),
      doctors(full_name, license_number, specialty),
      clinics(name, address, phone, logo_url)
    `)
    .eq('id', id)
    .eq('clinic_id', clinicId)
    .single()

  if (!letter) return NextResponse.json({ error: 'Surat tidak ditemukan' }, { status: 404 })

  const patient = letter.patients as unknown as LetterData['patient'] | null
  const doctor  = letter.doctors  as unknown as LetterData['doctor']  | null
  const clinic  = letter.clinics  as unknown as LetterData['clinic']  | null

  if (!patient || !doctor || !clinic) {
    return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 500 })
  }

  const letterData: LetterData = {
    letterNumber: letter.letter_number,
    type:         letter.type as 'sakit' | 'sehat' | 'rujukan',
    createdAt:    letter.created_at,
    patient, doctor, clinic,
    diagnosis:      letter.diagnosis,
    notes:          letter.notes,
    sickDays:       letter.sick_days,
    sickFrom:       letter.sick_from,
    sickUntil:      letter.sick_until,
    referredTo:     letter.referred_to,
    referralReason: letter.referral_reason,
    purpose:        letter.purpose,
  }

  const element = React.createElement(MedicalLetterDocument, { data: letterData }) as unknown as React.ReactElement<DocumentProps>
  const buffer  = await renderToBuffer(element)

  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${letter.letter_number}.pdf"`,
    },
  })
}
