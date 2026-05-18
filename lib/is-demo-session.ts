import { createClient } from '@/lib/supabase/server'

const DEMO_EMAIL = 'demo-admin@klinik-platform.com'

export async function isDemoSession(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.email === DEMO_EMAIL
}
