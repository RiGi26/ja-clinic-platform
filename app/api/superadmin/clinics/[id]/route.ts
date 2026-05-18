import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const VALID_PLANS = ['trial', 'basic', 'pro', 'custom'] as const

async function requireSuperAdmin(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const db = createAdminClient()
  const { data } = await db.from('users').select('role').eq('id', user.id).single()
  return data?.role === 'superadmin' ? user.id : null
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireSuperAdmin()
  if (!userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const body = await request.json() as {
    plan?: string; plan_expires_at?: string; is_active?: boolean
  }

  const updates: Record<string, unknown> = {}
  if (body.plan !== undefined) {
    if (!VALID_PLANS.includes(body.plan as typeof VALID_PLANS[number])) {
      return NextResponse.json({ error: 'Plan tidak valid' }, { status: 400 })
    }
    updates.plan = body.plan
  }
  if (body.plan_expires_at !== undefined) updates.plan_expires_at = body.plan_expires_at
  if (body.is_active !== undefined)       updates.is_active       = body.is_active

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Tidak ada field yang diupdate' }, { status: 400 })
  }

  const db = createAdminClient()
  const { error } = await db.from('clinics').update(updates).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
