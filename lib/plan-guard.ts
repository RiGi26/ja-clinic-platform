import { createAdminClient } from '@/lib/supabase/server'

export type ClinicPlanStatus = {
  isExpired: boolean
  isTrial: boolean
  daysLeft: number | null
  plan: string
}

const PAID_PLANS = ['basic', 'pro', 'custom']

export async function getClinicPlanStatus(clinicId: string): Promise<ClinicPlanStatus> {
  const db = createAdminClient()
  const { data: clinic } = await db
    .from('clinics')
    .select('plan, plan_expires_at')
    .eq('id', clinicId)
    .single()

  if (!clinic) return { isExpired: false, isTrial: false, daysLeft: null, plan: 'unknown' }

  const now = new Date()
  let daysLeft: number | null = null
  let isExpired = false

  if (clinic.plan_expires_at) {
    const expiry = new Date(clinic.plan_expires_at)
    daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    if (expiry < now && !PAID_PLANS.includes(clinic.plan)) {
      isExpired = true
    }
  }

  return {
    isExpired,
    isTrial: clinic.plan === 'trial',
    daysLeft,
    plan: clinic.plan,
  }
}
