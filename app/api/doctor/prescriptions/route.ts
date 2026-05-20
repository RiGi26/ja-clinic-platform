import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

async function getDoctorInfo() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const db = createAdminClient()
  const { data: profile } = await db.from('users').select('clinic_id, role').eq('id', user.id).single()
  if (!profile || profile.role !== 'doctor') return null
  const { data: doctor } = await db.from('doctors').select('id').eq('user_id', user.id).eq('clinic_id', profile.clinic_id).single()
  return { clinicId: profile.clinic_id as string, doctorId: doctor?.id as string, userId: user.id }
}

export async function GET(request: Request) {
  const info = await getDoctorInfo()
  if (!info) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const appointmentId = searchParams.get('appointment_id')
  if (!appointmentId) return NextResponse.json({ error: 'appointment_id wajib' }, { status: 400 })

  const db = createAdminClient()
  const { data: prescription } = await db
    .from('prescriptions')
    .select(`
      id, notes, status, prescription_number, created_at,
      prescription_items(
        id, quantity, dosage, duration, notes, medicine_id,
        medicines(id, name, unit, stock, price)
      )
    `)
    .eq('appointment_id', appointmentId)
    .eq('clinic_id', info.clinicId)
    .single()

  return NextResponse.json({ prescription: prescription ?? null })
}

export async function POST(request: Request) {
  const info = await getDoctorInfo()
  if (!info) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as {
    appointment_id: string; patient_id: string; notes: string; status: 'draft' | 'confirmed'
    items: { medicine_id: string; quantity: number; dosage: string; duration?: string; notes?: string }[]
  }

  const db = createAdminClient()

  const { data: existing } = await db
    .from('prescriptions')
    .select('id, status, prescription_number')
    .eq('appointment_id', body.appointment_id)
    .eq('clinic_id', info.clinicId)
    .single()

  if (existing?.status === 'confirmed' || existing?.status === 'dispensed') {
    return NextResponse.json({ error: 'Resep sudah dikonfirmasi dan tidak bisa diubah' }, { status: 403 })
  }

  let prescriptionId: string
  let prescriptionNumber: string

  if (existing) {
    prescriptionId     = existing.id
    prescriptionNumber = existing.prescription_number ?? ''
    await db.from('prescription_items').delete().eq('prescription_id', prescriptionId)
    await db.from('prescriptions').update({ notes: body.notes || null, status: body.status }).eq('id', prescriptionId)
  } else {
    const today       = new Date().toISOString().split('T')[0]
    const { count }   = await db.from('prescriptions').select('*', { count: 'exact', head: true }).eq('clinic_id', info.clinicId).gte('created_at', today + 'T00:00:00')
    prescriptionNumber = `PRE-${today.replace(/-/g, '')}-${String((count ?? 0) + 1).padStart(4, '0')}`

    const { data: newPre, error: preErr } = await db.from('prescriptions').insert({
      clinic_id:           info.clinicId,
      appointment_id:      body.appointment_id,
      patient_id:          body.patient_id,
      doctor_id:           info.userId,
      notes:               body.notes || null,
      status:              body.status,
      prescription_number: prescriptionNumber,
    }).select('id').single()

    if (preErr || !newPre) return NextResponse.json({ error: preErr?.message ?? 'Gagal membuat resep' }, { status: 500 })
    prescriptionId = newPre.id
  }

  if (body.items.length > 0) {
    const { error: itemsErr } = await db.from('prescription_items').insert(
      body.items.map(item => ({
        prescription_id: prescriptionId,
        medicine_id:     item.medicine_id,
        quantity:        item.quantity,
        dosage:          item.dosage,
        duration:        item.duration ?? null,
        notes:           item.notes ?? null,
      }))
    )
    if (itemsErr) return NextResponse.json({ error: itemsErr.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, prescription_id: prescriptionId, prescription_number: prescriptionNumber })
}
