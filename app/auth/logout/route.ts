import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/auth/login')
}
