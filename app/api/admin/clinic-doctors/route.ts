import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createAdminClient()
  const { data: profile } = await db.from('users').select('clinic_id').eq('id', user.id).single()
  if (!profile?.clinic_id) return NextResponse.json({ doctors: [] })

  const { data: doctors } = await db.from('doctors')
    .select('id, full_name, specialty')
    .eq('clinic_id', profile.clinic_id)
    .eq('is_active', true)
    .order('full_name')

  return NextResponse.json({ doctors: doctors ?? [] })
}
