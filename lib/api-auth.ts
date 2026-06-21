import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getClinicPlanStatus } from '@/lib/plan-guard'

type AdminDb = ReturnType<typeof createAdminClient>

export type ApiAuthOk = {
  ok: true
  db: AdminDb
  userId: string
  clinicId: string
  role: string
}
export type ApiAuthErr = { ok: false; res: NextResponse }
export type ApiAuth = ApiAuthOk | ApiAuthErr

type RequireOpts = {
  /** Allowed roles. Omit to allow any authenticated user that belongs to a clinic. */
  roles?: string[]
  /** Reject when the clinic's plan is expired or the clinic is suspended (write-guard). */
  activeClinic?: boolean
}

/**
 * Resolve the authenticated clinic user for an API route and enforce
 * role + clinic-active gating in one place.
 *
 * Returns a discriminated union: on failure `{ ok:false, res }` carries a ready
 * NextResponse (401/403) to return directly; on success `{ ok:true, ... }` carries
 * the admin db client and the user's clinic_id/role.
 */
export async function requireApiUser(opts: RequireOpts = {}): Promise<ApiAuth> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, res: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const db = createAdminClient()
  const { data: profile } = await db
    .from('users')
    .select('clinic_id, role, status')
    .eq('id', user.id)
    .single()

  if (!profile?.clinic_id || profile.status !== 'active') {
    return { ok: false, res: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  if (opts.roles && !opts.roles.includes(profile.role)) {
    return { ok: false, res: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  if (opts.activeClinic) {
    const status = await getClinicPlanStatus(profile.clinic_id)
    if (status.isBlocked) {
      return {
        ok: false,
        res: NextResponse.json(
          { error: 'Masa aktif klinik telah berakhir atau ditangguhkan. Hubungi tim kami.' },
          { status: 403 },
        ),
      }
    }
  }

  return { ok: true, db, userId: user.id, clinicId: profile.clinic_id, role: profile.role }
}

/**
 * Verify a single row referenced by a request body actually belongs to the
 * caller's clinic. Guards against cross-tenant IDOR where a body-supplied id
 * (patient_id, appointment_id, doctor_id, …) points at another clinic's row.
 */
export async function belongsToClinic(
  db: AdminDb,
  table: string,
  id: string | null | undefined,
  clinicId: string,
): Promise<boolean> {
  if (!id) return false
  const { data } = await db
    .from(table)
    .select('id')
    .eq('id', id)
    .eq('clinic_id', clinicId)
    .maybeSingle()
  return !!data
}

/** Same as belongsToClinic but for a list of ids — true only if ALL belong to the clinic. */
export async function allBelongToClinic(
  db: AdminDb,
  table: string,
  ids: string[],
  clinicId: string,
): Promise<boolean> {
  const unique = [...new Set(ids.filter(Boolean))]
  if (unique.length === 0) return true
  const { count } = await db
    .from(table)
    .select('id', { count: 'exact', head: true })
    .in('id', unique)
    .eq('clinic_id', clinicId)
  return (count ?? 0) === unique.length
}
