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

const VALID_PLANS = ['trial', 'basic', 'pro', 'custom']

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireSuperAdmin()
  if (!userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { plan, expires_at } = await request.json() as { plan?: string; expires_at?: string }

  if (!plan || !VALID_PLANS.includes(plan)) {
    return NextResponse.json({ error: 'Plan tidak valid' }, { status: 400 })
  }
  if (plan === 'trial' && !expires_at) {
    return NextResponse.json({ error: 'expires_at wajib untuk plan trial' }, { status: 400 })
  }

  const { id } = await params
  const db = createAdminClient()
  const activatedAt = new Date().toISOString()

  const { error } = await db
    .from('clinics')
    .update({
      plan,
      is_active: true,
      plan_expires_at: expires_at ?? null,
      suspended_at: null,
      suspended_reason: null,
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
      message: `Klinik diaktifkan oleh superadmin. Plan: ${plan}`,
      status: 'sent',
      sent_at: activatedAt,
    })
  }

  return NextResponse.json({ success: true, plan, plan_expires_at: expires_at ?? null })
}
