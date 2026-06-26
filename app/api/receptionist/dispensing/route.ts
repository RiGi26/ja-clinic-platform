import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { sendAndLog } from '@/lib/notifications'
import { guardEntitlementApi } from '@/lib/clinic-entitlements'

export const dynamic = 'force-dynamic'

async function getClinicId() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const db = createAdminClient()
  const { data } = await db.from('users').select('clinic_id, role').eq('id', user.id).single()
  if (!data?.clinic_id || !['admin', 'receptionist'].includes(data.role)) return null
  return data.clinic_id as string
}

export async function GET() {
  const clinicId = await getClinicId()
  if (!clinicId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const gate = await guardEntitlementApi(clinicId, 'pharmacy'); if (gate) return gate

  const now   = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const end   = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString()

  const db = createAdminClient()
  const { data, error } = await db
    .from('prescriptions')
    .select(`
      id, status, prescription_number, notes, created_at,
      patients(full_name, no_rm, phone),
      prescription_items(
        id, quantity, dosage, duration, medicine_id,
        medicines(id, name, unit, stock, price)
      ),
      appointments(scheduled_at, doctors(full_name))
    `)
    .eq('clinic_id', clinicId)
    .in('status', ['confirmed', 'dispensed'])
    .gte('created_at', start)
    .lt('created_at', end)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ prescriptions: data ?? [] })
}

export async function PATCH(request: Request) {
  const clinicId = await getClinicId()
  if (!clinicId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const gate = await guardEntitlementApi(clinicId, 'pharmacy'); if (gate) return gate

  const { prescription_id } = await request.json() as { prescription_id: string }
  const db = createAdminClient()

  // Atomic dispense: locks the prescription + each medicine row, validates stock,
  // decrements, writes the ledger, and flips status to 'dispensed' in one tx.
  // Replaces the former read-then-write loop that raced on medicines.stock.
  const { data: result, error } = await db.rpc('dispense_prescription', {
    p_prescription_id: prescription_id,
    p_clinic_id:       clinicId,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const r = (result ?? {}) as {
    ok: boolean
    code?: string
    items?: { name: string; stock: number; needed: number }[]
    patient_id?: string
  }
  if (!r.ok) {
    if (r.code === 'insufficient') {
      return NextResponse.json({ error: 'Stok tidak mencukupi', items: r.items ?? [] }, { status: 400 })
    }
    return NextResponse.json({ error: 'Resep tidak ditemukan atau sudah dikeluarkan' }, { status: 404 })
  }

  // WA notification (non-blocking)
  const [{ data: patient }, { data: clinic }] = await Promise.all([
    db.from('patients').select('full_name, phone').eq('id', r.patient_id).single(),
    db.from('clinics').select('name, fonnte_token').eq('id', clinicId).single(),
  ])

  if (patient?.phone && clinic?.fonnte_token) {
    sendAndLog(db, clinicId, {
      type: 'general', recipient: patient.phone,
      message: `Halo ${patient.full_name}, obat Anda di ${clinic.name} sudah siap diambil di meja receptionist.`,
      phone: patient.phone, token: clinic.fonnte_token,
    }).catch(console.error)
  }

  return NextResponse.json({ success: true })
}
