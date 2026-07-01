import { NextResponse } from 'next/server'
import { requireApiUser } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

// GET /api/admin/patients — minimal patient list for pickers (e.g. sell package).
export async function GET() {
  const auth = await requireApiUser({ roles: ['admin'] })
  if (!auth.ok) return auth.res
  const { db, clinicId } = auth

  const { data, error } = await db
    .from('patients')
    .select('id, full_name, no_rm')
    .eq('clinic_id', clinicId)
    .order('full_name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ patients: data ?? [] })
}
