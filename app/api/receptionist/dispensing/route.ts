import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { sendAndLog } from '@/lib/notifications'

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

  const { prescription_id } = await request.json() as { prescription_id: string }
  const db = createAdminClient()

  const { data: prescription } = await db
    .from('prescriptions')
    .select(`
      id, status, patient_id,
      prescription_items(id, quantity, medicine_id, medicines(id, name, stock, price, unit))
    `)
    .eq('id', prescription_id)
    .eq('clinic_id', clinicId)
    .eq('status', 'confirmed')
    .single()

  if (!prescription) {
    return NextResponse.json({ error: 'Resep tidak ditemukan atau sudah dikeluarkan' }, { status: 404 })
  }

  // Check all stocks
  const insufficient: { name: string; stock: number; needed: number }[] = []
  for (const item of prescription.prescription_items as any[]) {
    const med = item.medicines as any
    if ((med?.stock ?? 0) < item.quantity) {
      insufficient.push({ name: med?.name ?? '', stock: med?.stock ?? 0, needed: item.quantity })
    }
  }
  if (insufficient.length > 0) {
    return NextResponse.json({ error: 'Stok tidak mencukupi', items: insufficient }, { status: 400 })
  }

  // Update stocks + insert transactions
  await Promise.all(
    (prescription.prescription_items as any[]).map(async (item) => {
      const med        = item.medicines as any
      const stockAfter = (med.stock ?? 0) - item.quantity
      await db.from('medicine_transactions').insert({
        clinic_id:    clinicId,
        medicine_id:  item.medicine_id,
        type:         'keluar',
        quantity:     item.quantity,
        stock_before: med.stock,
        stock_after:  stockAfter,
        notes:        `Resep ${prescription_id.slice(-8)}`,
      })
      await db.from('medicines').update({ stock: stockAfter }).eq('id', item.medicine_id).eq('clinic_id', clinicId)
    })
  )

  await db.from('prescriptions').update({ status: 'dispensed' }).eq('id', prescription_id)

  // WA notification (non-blocking)
  const [{ data: patient }, { data: clinic }] = await Promise.all([
    db.from('patients').select('full_name, phone').eq('id', prescription.patient_id).single(),
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
