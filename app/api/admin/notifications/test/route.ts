import { NextResponse } from 'next/server'
import { requireApiUser } from '@/lib/api-auth'
import { sendWhatsApp } from '@/lib/fonnte'

export const dynamic = 'force-dynamic'

export async function POST() {
  const auth = await requireApiUser({ roles: ['admin'], entitlement: 'notifications' })
  if (!auth.ok) return auth.res
  const { db, clinicId } = auth

  const { data: clinic } = await db
    .from('clinics')
    .select('name, phone, fonnte_token')
    .eq('id', clinicId)
    .single()

  if (!clinic?.fonnte_token) {
    return NextResponse.json(
      { error: 'Fonnte token belum dikonfigurasi. Isi token terlebih dahulu.' },
      { status: 400 },
    )
  }

  if (!clinic.phone) {
    return NextResponse.json(
      { error: 'Nomor telepon klinik belum diisi. Isi di bagian Informasi Klinik.' },
      { status: 400 },
    )
  }

  const result = await sendWhatsApp(
    clinic.fonnte_token,
    clinic.phone,
    `✅ Test notifikasi dari ${clinic.name}. Fonnte WhatsApp berhasil terhubung!`,
  )

  return NextResponse.json(result, { status: result.success ? 200 : 500 })
}
