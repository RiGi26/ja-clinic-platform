import { createClient, createAdminClient } from './supabase/server'
import { redirect } from 'next/navigation'

export type ClinicUser = {
  id        : string
  email     : string | null
  full_name : string
  role      : string
  clinic_id : string
  status    : string
}

/** Ambil user yang login + clinic_id-nya. Redirect ke login jika tidak valid. */
export async function getClinicUser(): Promise<ClinicUser> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const db = createAdminClient()
  const { data: profile } = await db
    .from('users')
    .select('id, full_name, role, clinic_id, status')
    .eq('id', user.id)
    .single()

  if (!profile || profile.status !== 'active' || !profile.clinic_id) {
    redirect('/auth/login')
  }

  return { ...profile, email: user.email ?? null }
}
