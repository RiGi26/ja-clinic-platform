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
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireSuperAdmin()
  if (!userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const db = createAdminClient()

  const { data: clinic } = await db
    .from('clinics')
    .select('plan_expires_at')
    .eq('id', id)
    .single()

  if (!clinic) return NextResponse.json({ error: 'Klinik tidak ditemukan' }, { status: 404 })

  const base = clinic.plan_expires_at && new Date(clinic.plan_expires_at) > new Date()
    ? new Date(clinic.plan_expires_at)
    : new Date()

  const newExpiry = new Date(base.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString()

  const { error } = await db
    .from('clinics')
    .update({ plan: 'trial', plan_expires_at: newExpiry })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, plan_expires_at: newExpiry })
}
