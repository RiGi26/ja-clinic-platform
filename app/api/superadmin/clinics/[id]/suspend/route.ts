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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireSuperAdmin()
  if (!userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { reason } = await request.json() as { reason?: string }
  if (!reason?.trim()) {
    return NextResponse.json({ error: 'Alasan suspend wajib diisi' }, { status: 400 })
  }

  const { id } = await params
  const db = createAdminClient()
  const suspendedAt = new Date().toISOString()

  const { error } = await db
    .from('clinics')
    .update({
      plan: 'suspended',
      is_active: false,
      suspended_at: suspendedAt,
      suspended_reason: reason.trim(),
    })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: admin } = await db
    .from('users')
    .select('email')
    .eq('clinic_id', id)
    .eq('role', 'admin')
    .limit(1)
    .single()

  if (admin?.email) {
    await db.from('notifications').insert({
      clinic_id: id,
      type: 'general',
      recipient: admin.email,
      message: `Klinik disuspend oleh superadmin. Alasan: ${reason.trim()}`,
      status: 'sent',
      sent_at: suspendedAt,
    })
  }

  return NextResponse.json({ success: true, suspended_at: suspendedAt })
}
