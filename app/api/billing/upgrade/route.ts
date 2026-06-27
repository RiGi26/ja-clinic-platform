import { NextResponse } from 'next/server'
import { getClinicUser } from '@/lib/clinic'
import { isDemoSession } from '@/lib/is-demo-session'
import { createAdminClient } from '@/lib/supabase/server'
import { signBillingToken, superadminBaseUrl, appOrigin } from '@/lib/billing-link'

// ============================================================
// GET /api/billing/upgrade — mint a checkout token for the logged-in clinic and
// redirect to the superadmin payment page (mint side of the cross-DB billing link).
//
// The token carries the clinic's *Core* id (tenant_entitlements.linked_tenant_id,
// set when Core provisioned this clinic). Admin-only; clinic id is read server-side
// from the session, never from client input.
// ============================================================
export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getClinicUser() // redirects to /auth/login when unauthenticated

  if (user.role !== 'admin') {
    return NextResponse.redirect(new URL('/admin/langganan?error=forbidden', appOrigin()))
  }
  if (await isDemoSession()) {
    return NextResponse.redirect(new URL('/admin/langganan?error=demo', appOrigin()))
  }

  const db = createAdminClient()
  const { data: ent } = await db
    .from('tenant_entitlements')
    .select('linked_tenant_id')
    .eq('clinic_id', user.clinic_id)
    .maybeSingle()

  const coreTenantId = ent?.linked_tenant_id as string | null | undefined
  if (!coreTenantId) {
    return NextResponse.redirect(new URL('/admin/langganan?error=not_provisioned', appOrigin()))
  }

  let token: string
  try {
    token = signBillingToken(coreTenantId)
  } catch (err) {
    console.error('[billing/upgrade] mint token failed:', err instanceof Error ? err.message : err)
    return NextResponse.redirect(new URL('/admin/langganan?error=billing_link_unavailable', appOrigin()))
  }

  const dest = new URL('/billing/langganan', superadminBaseUrl())
  dest.searchParams.set('token', token)
  return NextResponse.redirect(dest)
}
