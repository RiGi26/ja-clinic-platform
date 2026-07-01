import { NextResponse } from 'next/server'
import { requireApiUser, belongsToClinic } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

const BUCKET = 'visit-photos'
const MAX_BYTES = 5 * 1024 * 1024
const EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}
const SIGNED_TTL = 3600 // 1 jam — timeline & form regenerate fresh tiap fetch

type PhotoRow = { id: string; phase: string; caption: string | null; storage_path: string; created_at: string }

async function sign(
  db: ReturnType<typeof import('@/lib/supabase/server').createAdminClient>,
  rows: PhotoRow[],
) {
  return Promise.all(
    rows.map(async r => {
      const { data } = await db.storage.from(BUCKET).createSignedUrl(r.storage_path, SIGNED_TTL)
      return { id: r.id, phase: r.phase, caption: r.caption, created_at: r.created_at, url: data?.signedUrl ?? null }
    }),
  )
}

// POST — upload a session photo (multipart/form-data)
export async function POST(request: Request) {
  const auth = await requireApiUser({ roles: ['doctor'], activeClinic: true })
  if (!auth.ok) return auth.res
  const { db, userId, clinicId } = auth

  const form = await request.formData()
  const file = form.get('file')
  const appointmentId = (form.get('appointment_id') as string) || null
  const patientId = (form.get('patient_id') as string) || null
  const phaseRaw = (form.get('phase') as string) || 'progress'
  const caption = ((form.get('caption') as string) || '').trim() || null
  const phase = ['before', 'after', 'progress'].includes(phaseRaw) ? phaseRaw : 'progress'

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'File wajib' }, { status: 400 })
  }
  if (!patientId) {
    return NextResponse.json({ error: 'patient_id wajib' }, { status: 400 })
  }
  if (!EXT[file.type]) {
    return NextResponse.json({ error: 'Format harus JPG, PNG, atau WEBP' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Ukuran maksimal 5 MB' }, { status: 400 })
  }

  // Cross-tenant guards
  if (!(await belongsToClinic(db, 'patients', patientId, clinicId))) {
    return NextResponse.json({ error: 'Data tidak ditemukan' }, { status: 404 })
  }
  if (appointmentId && !(await belongsToClinic(db, 'appointments', appointmentId, clinicId))) {
    return NextResponse.json({ error: 'Data tidak ditemukan' }, { status: 404 })
  }

  const { data: doctor } = await db
    .from('doctors')
    .select('id')
    .eq('user_id', userId)
    .eq('clinic_id', clinicId)
    .maybeSingle()

  const path = `${clinicId}/${patientId}/${crypto.randomUUID()}.${EXT[file.type]}`
  const { error: upErr } = await db.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  })
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

  const { data: row, error: insErr } = await db
    .from('visit_photos')
    .insert({
      clinic_id: clinicId,
      patient_id: patientId,
      appointment_id: appointmentId,
      doctor_id: doctor?.id ?? null,
      storage_path: path,
      phase,
      caption,
    })
    .select('id, phase, caption, storage_path, created_at')
    .single()

  if (insErr || !row) {
    // roll back the orphaned object
    await db.storage.from(BUCKET).remove([path])
    return NextResponse.json({ error: insErr?.message ?? 'Gagal menyimpan foto' }, { status: 500 })
  }

  const [signed] = await sign(db, [row as PhotoRow])
  return NextResponse.json({ photo: signed })
}

// GET — list photos for an appointment or a patient (fresh signed URLs)
export async function GET(request: Request) {
  const auth = await requireApiUser({ roles: ['doctor'] })
  if (!auth.ok) return auth.res
  const { db, clinicId } = auth

  const { searchParams } = new URL(request.url)
  const appointmentId = searchParams.get('appointment_id')
  const patientId = searchParams.get('patient_id')
  if (!appointmentId && !patientId) {
    return NextResponse.json({ error: 'appointment_id atau patient_id wajib' }, { status: 400 })
  }

  let q = db
    .from('visit_photos')
    .select('id, phase, caption, storage_path, created_at')
    .eq('clinic_id', clinicId)
    .order('created_at', { ascending: true })
  q = appointmentId ? q.eq('appointment_id', appointmentId) : q.eq('patient_id', patientId!)

  const { data: rows } = await q
  const photos = await sign(db, (rows ?? []) as PhotoRow[])
  return NextResponse.json({ photos })
}

// DELETE — remove a photo (storage object + row), clinic-guarded
export async function DELETE(request: Request) {
  const auth = await requireApiUser({ roles: ['doctor'], activeClinic: true })
  if (!auth.ok) return auth.res
  const { db, clinicId } = auth

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id wajib' }, { status: 400 })

  const { data: row } = await db
    .from('visit_photos')
    .select('id, storage_path')
    .eq('id', id)
    .eq('clinic_id', clinicId)
    .maybeSingle()
  if (!row) return NextResponse.json({ error: 'Foto tidak ditemukan' }, { status: 404 })

  await db.storage.from(BUCKET).remove([(row as { storage_path: string }).storage_path])
  await db.from('visit_photos').delete().eq('id', id).eq('clinic_id', clinicId)
  return NextResponse.json({ success: true })
}
