import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { sendWhatsApp } from '@/lib/fonnte'

export const dynamic = 'force-dynamic'

async function getClinicId() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const db = createAdminClient()
  const { data } = await db.from('users').select('clinic_id').eq('id', user.id).single()
  return data?.clinic_id ?? null
}

export async function POST() {
  const clinicId = await getClinicId()
  if (!clinicId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createAdminClient()
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
