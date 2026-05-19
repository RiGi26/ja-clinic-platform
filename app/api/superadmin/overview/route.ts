import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

async function requireSuperAdmin(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const db = createAdminClient()
  const { data } = await db.from('users').select('role').eq('id', user.id).single()
  return data?.role === 'superadmin'
}

export async function GET() {
  const ok = await requireSuperAdmin()
  if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const db = createAdminClient()
  const now = new Date()
  const nowIso = now.toISOString()
  const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1).toISOString()

  const [
    { count: total },
    { count: trial },
    { count: paid },
    { count: suspended },
    { count: newThisMonth },
    { data: trialExpiring },
    { data: recentlyExpired },
    { data: users },
    { data: clinicsGrowth },
  ] = await Promise.all([
    db.from('clinics').select('*', { count: 'exact', head: true }),
    db.from('clinics').select('*', { count: 'exact', head: true }).eq('plan', 'trial').eq('is_active', true),
    db.from('clinics').select('*', { count: 'exact', head: true }).in('plan', ['basic', 'pro', 'custom']).eq('is_active', true),
    db.from('clinics').select('*', { count: 'exact', head: true }).or('plan.eq.suspended,is_active.eq.false'),
    db.from('clinics').select('*', { count: 'exact', head: true }).gte('created_at', monthStart),
    db.from('clinics')
      .select('id, name, email, phone, plan_expires_at, slug')
      .eq('plan', 'trial')
      .eq('is_active', true)
      .not('plan_expires_at', 'is', null)
      .lte('plan_expires_at', sevenDays)
      .gt('plan_expires_at', nowIso)
      .order('plan_expires_at', { ascending: true }),
    db.from('clinics')
      .select('id, name, email, phone, plan_expires_at, slug')
      .lt('plan_expires_at', nowIso)
      .not('plan', 'in', '(basic,pro,custom,suspended)')
      .eq('is_active', true)
      .order('plan_expires_at', { ascending: false })
      .limit(5),
    db.from('users').select('role'),
    db.from('clinics')
      .select('created_at')
      .gte('created_at', sixMonthsAgo)
      .order('created_at', { ascending: true }),
  ])

  const userStats = { admin: 0, doctor: 0, receptionist: 0, patient: 0 }
  for (const u of users ?? []) {
    const role = u.role as keyof typeof userStats
    if (role in userStats) userStats[role]++
  }

  const growthMap = new Map<string, number>()
  for (const c of clinicsGrowth ?? []) {
    const key = new Intl.DateTimeFormat('en-US', { month: 'short', year: '2-digit' }).format(new Date(c.created_at))
    growthMap.set(key, (growthMap.get(key) ?? 0) + 1)
  }
  const growth = Array.from(growthMap.entries()).map(([month, count]) => ({ month, count }))

  return NextResponse.json({
    clinic_stats: {
      total: total ?? 0,
      trial: trial ?? 0,
      paid: paid ?? 0,
      suspended: suspended ?? 0,
      new_this_month: newThisMonth ?? 0,
    },
    trial_expiring: trialExpiring ?? [],
    recently_expired: recentlyExpired ?? [],
    user_stats: userStats,
    growth,
  })
}
