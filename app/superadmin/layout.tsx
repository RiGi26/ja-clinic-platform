import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { LayoutDashboard, Building2, Users, LogOut } from 'lucide-react'

export const dynamic = 'force-dynamic'

async function SuperAdminSidebar({ userName }: { userName: string }) {
  const NAV = [
    { href: '/superadmin',         Icon: LayoutDashboard, label: 'Dashboard'      },
    { href: '/superadmin/clinics', Icon: Building2,       label: 'Semua Klinik'   },
    { href: '/superadmin/users',   Icon: Users,           label: 'Pengguna'        },
  ]

  return (
    <aside className="fixed top-0 left-0 h-full w-60 z-50 flex flex-col" style={{ background: '#1C1C1E' }}>
      <div className="px-5 h-[72px] flex items-center border-b border-white/10">
        <div>
          <p className="text-white font-black text-sm leading-tight">Super Admin</p>
          <p className="text-white/40 text-[11px] mt-0.5">Japan Arena Corp</p>
        </div>
      </div>

      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map(item => (
          <Link key={item.href} href={item.href}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-white/60 hover:bg-white/10 hover:text-white transition-all">
            <item.Icon size={16} className="flex-shrink-0" />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-white/10 space-y-3">
        <div className="px-3">
          <p className="text-white text-sm font-black truncate">{userName}</p>
          <p className="text-white/40 text-xs">Super Admin</p>
        </div>
        <a href="/auth/logout"
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-white/40 hover:bg-white/10 hover:text-white transition-all text-sm font-semibold">
          <LogOut size={14} /> Keluar
        </a>
      </div>
    </aside>
  )
}

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
    <div className="flex min-h-screen bg-gray-50">
      <SuperAdminSidebar userName={profile.full_name} />
      <main className="flex-1 ml-60 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
