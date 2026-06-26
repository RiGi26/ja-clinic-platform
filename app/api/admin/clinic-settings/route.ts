import { NextResponse } from 'next/server'
import { requireApiUser } from '@/lib/api-auth'
import { getClinicEntitlements } from '@/lib/clinic-entitlements'

export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireApiUser({ roles: ['admin'] })
  if (!auth.ok) return auth.res
  const { db, clinicId } = auth

  const [{ data: clinic }, { data: doctors }] = await Promise.all([
    db.from('clinics').select('name, address, phone, email, fonnte_token').eq('id', clinicId).single(),
    db.from('doctors').select('id, full_name, specialty, consultation_fee, is_active').eq('clinic_id', clinicId).order('full_name'),
  ])

  return NextResponse.json({ clinic: clinic ?? {}, doctors: doctors ?? [] })
}

export async function POST(request: Request) {
  const auth = await requireApiUser({ roles: ['admin'] })
  if (!auth.ok) return auth.res
  const { db, clinicId } = auth

  const { clinic, doctors } = await request.json()

  // Seat limit (active doctors) per tier. The settings page submits the full doctor
  // list, so the active count in the payload IS the resulting active count — reject
  // before any write when it would exceed the clinic's package limit.
  const ent = await getClinicEntitlements(clinicId)
  if (ent.maxActiveUsers !== null) {
    const activeCount = (doctors as { is_active?: boolean }[]).filter(d => d.is_active).length
    if (activeCount > ent.maxActiveUsers) {
      return NextResponse.json(
        {
          error: `Paket langganan Anda membatasi ${ent.maxActiveUsers} dokter aktif. Nonaktifkan dokter lain atau tingkatkan paket untuk menambah.`,
          upsell: 'seats',
        },
        { status: 403 },
      )
    }
  }

  // Update clinic info
  await db.from('clinics').update({
    name: clinic.name,
    address: clinic.address,
    phone: clinic.phone,
    email: clinic.email,
    ...(clinic.fonnte_token !== undefined ? { fonnte_token: clinic.fonnte_token } : {}),
  }).eq('id', clinicId)

  // Upsert doctors — scoped to this clinic so a foreign doctor id can't be overwritten
  for (const doc of doctors) {
    if (doc.id) {
      await db.from('doctors')
        .update({ full_name: doc.full_name, specialty: doc.specialty, consultation_fee: doc.consultation_fee, is_active: doc.is_active })
        .eq('id', doc.id)
        .eq('clinic_id', clinicId)
    } else {
      await db.from('doctors').insert({ clinic_id: clinicId, full_name: doc.full_name, specialty: doc.specialty, consultation_fee: doc.consultation_fee, is_active: doc.is_active })
    }
  }

  return NextResponse.json({ success: true })
}
