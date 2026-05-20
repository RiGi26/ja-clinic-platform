import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import SuperAdminClientLayout from './SuperAdminClientLayout'

export const dynamic = 'force-dynamic'

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const db = createAdminClient()
  const { data: profile } = await db
    .from('users')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'superadmin') redirect('/auth/login')

  return (
    <div className="h-screen flex overflow-hidden bg-bg text-text">
      <SuperAdminClientLayout userName={profile.full_name}>
        <div className="p-6 md:p-10 w-full max-w-7xl mx-auto animate-fade-in">
          {children}
        </div>
      </SuperAdminClientLayout>
    </div>
  )
}
