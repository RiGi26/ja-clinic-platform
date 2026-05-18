import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

async function requireSuperAdmin(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const db = createAdminClient()
  const { data } = await db.from('users').select('role').eq('id', user.id).single()
  return data?.role === 'superadmin' ? user.id : null
}

export async function POST(request: Request) {
  const superAdminId = await requireSuperAdmin()
  if (!superAdminId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { clinic_id } = await request.json() as { clinic_id?: string }
  if (!clinic_id) return NextResponse.json({ error: 'clinic_id wajib diisi' }, { status: 400 })

  const db = createAdminClient()

  const { data: adminUser } = await db
    .from('users')
    .select('id, email, full_name')
    .eq('clinic_id', clinic_id)
    .eq('role', 'admin')
    .eq('status', 'active')
    .limit(1)
    .single()

  if (!adminUser?.email) {
    return NextResponse.json({ error: 'Admin klinik tidak ditemukan' }, { status: 404 })
  }

  const { data: clinic } = await db.from('clinics').select('name').eq('id', clinic_id).single()

  // Generate magic link (expires 60 seconds)
  const { data: linkData, error: linkErr } = await db.auth.admin.generateLink({
    type:  'magiclink',
    email: adminUser.email,
    options: { redirectTo: '/admin' },
  })

  if (linkErr || !linkData?.properties?.action_link) {
    return NextResponse.json({ error: 'Gagal generate magic link: ' + linkErr?.message }, { status: 500 })
  }

  // Audit log
  await db.from('notifications').insert({
    clinic_id,
    type:      'general',
    recipient: adminUser.email,
    message:   `Superadmin melakukan impersonasi ke klinik ${clinic?.name ?? clinic_id}`,
    status:    'sent',
    sent_at:   new Date().toISOString(),
  })

  return NextResponse.json({
    success:    true,
    magic_link: linkData.properties.action_link,
    admin_name: adminUser.full_name,
    clinic_name: clinic?.name,
  })
}
