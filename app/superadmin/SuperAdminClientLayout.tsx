'use client'

import { ReactNode, useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Building2, Users, LogOut,
  ChevronLeft, ChevronRight, Menu, X,
} from 'lucide-react'

const NAV = [
  { href: '/superadmin',         Icon: LayoutDashboard, label: 'Dashboard'    },
  { href: '/superadmin/clinics', Icon: Building2,       label: 'Semua Klinik' },
  { href: '/superadmin/users',   Icon: Users,           label: 'Pengguna'     },
]

export default function SuperAdminClientLayout({
  children,
  userName,
}: {
  children: ReactNode
  userName: string
}) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen]   = useState(false)
  const [mounted, setMounted]         = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const saved = localStorage.getItem('sa-clinic-sb-collapsed') === 'true'
    setIsCollapsed(saved)
    setMounted(true)
  }, [])

  const handleCollapse = (v: boolean) => {
    setIsCollapsed(v)
    localStorage.setItem('sa-clinic-sb-collapsed', String(v))
  }

  const isActive = (href: string) =>
    href === '/superadmin' ? pathname === '/superadmin' : pathname.startsWith(href)

  const pageTitle = NAV.find(i => isActive(i.href))?.label ?? 'Superadmin'

  // Shared nav items
  const NavItems = ({ onClose }: { onClose?: () => void }) => (
    <>
      {NAV.map((item) => {
        const active = isActive(item.href)
        const Icon = item.Icon
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClose}
            className={`flex items-center px-3 py-2.5 rounded-xl text-sm sf-display relative overflow-hidden transition-colors
              ${active
                ? 'bg-[#0071E3]/10 text-[#0071E3] font-bold'
                : 'text-gray-600 hover:bg-black/5 hover:text-gray-900'}
            `}
          >
            {active && <div className="absolute left-0 top-[15%] h-[70%] w-[3px] bg-[#0071E3] rounded-r-md" />}
            <div className="w-6 flex justify-center shrink-0">
              <Icon size={18} className={`transition-opacity ${active ? 'opacity-100' : 'opacity-70'}`} />
            </div>
            <span className="ml-3 tracking-tight whitespace-nowrap">{item.label}</span>
          </Link>
        )
      })}
    </>
  )

  return (
    <>
      {/* ─── Mobile Top Bar ───────────────────────────────────────── */}
      <header className="md:hidden fixed top-0 w-full h-14 bg-white/80 backdrop-blur-xl border-b border-black/5 z-30 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setMobileOpen(true)} className="p-2 -ml-2 text-gray-600 rounded-lg hover:bg-black/5">
            <Menu size={22} />
          </button>
          <Image src="/images/Icon.png" alt="Logo" width={28} height={28} className="object-contain" />
          <h1 className="text-[17px] sf-display-heavy text-[#1D1D1F] truncate max-w-[180px]">{pageTitle}</h1>
        </div>
        <form action="/auth/logout" method="post">
          <button type="submit" className="p-2 text-[#FF3B30] rounded-lg hover:bg-red-50">
            <LogOut size={20} />
          </button>
        </form>
      </header>

      {/* ─── Mobile Overlay ───────────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ─── Mobile Drawer ────────────────────────────────────────── */}
      <aside
        className={`md:hidden fixed left-0 top-0 h-full w-72 apple-glass border-r border-black/5 z-50 flex flex-col transition-transform duration-300 shadow-[4px_0_24px_rgba(0,0,0,0.08)]
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="px-5 pt-8 pb-5 flex items-center justify-between h-24 shrink-0">
          <div className="flex items-center gap-3">
            <Image src="/images/Icon.png" alt="Logo" width={36} height={36} className="object-contain drop-shadow-sm" />
            <div>
              <h1 className="text-lg sf-display-heavy tracking-tight text-[#1D1D1F] leading-none">Japan Arena</h1>
              <div className="mt-1 bg-[#FF3B30] text-white text-[9px] px-2 py-0.5 rounded uppercase font-bold tracking-widest inline-block">
                Superadmin
              </div>
            </div>
          </div>
          <button onClick={() => setMobileOpen(false)} className="p-2 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-black/5">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-3 space-y-1 overflow-y-auto scrollbar-hide pb-4">
          <p className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Platform Admin</p>
          <NavItems onClose={() => setMobileOpen(false)} />
        </nav>

        <div className="p-4 border-t border-black/5 bg-white/50 shrink-0">
          <div className="flex items-center p-2 rounded-xl mb-2">
            <div className="w-10 h-10 rounded-full bg-white border border-black/10 shrink-0 shadow-sm flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50">
              <span className="text-sm font-bold text-[#FF3B30]">SA</span>
            </div>
            <div className="ml-3 flex-1 min-w-0">
              <p className="text-[14px] sf-display truncate text-gray-900">{userName}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF3B30]" />
                <p className="text-[11px] text-gray-500 font-medium">Superadmin</p>
              </div>
            </div>
          </div>
          <form action="/auth/logout" method="post">
            <button type="submit" className="flex items-center justify-center gap-2 w-full py-2 px-4 bg-[#FF3B30]/10 text-[#FF3B30] text-[11px] font-bold rounded-lg hover:bg-[#FF3B30]/20 transition-colors">
              <LogOut size={14} /> Keluar Sistem
            </button>
          </form>
        </div>
      </aside>

      {/* ─── Desktop Sidebar ──────────────────────────────────────── */}
      <aside
        className={`hidden md:flex flex-col fixed left-0 top-0 h-full apple-glass border-r border-black/5 z-50 shrink-0 transition-all duration-300 shadow-[4px_0_24px_rgba(0,0,0,0.02)]
        ${isCollapsed ? 'w-20' : 'w-64'}`}
      >
        <button
          onClick={() => handleCollapse(!isCollapsed)}
          className="absolute -right-3 top-10 bg-white border border-black/10 rounded-full p-1.5 shadow-sm text-gray-400 hover:text-black hover:shadow-md z-30 transform transition-all hover:scale-110"
        >
          {isCollapsed ? <ChevronRight size={14} strokeWidth={2.5} /> : <ChevronLeft size={14} strokeWidth={2.5} />}
        </button>

        <div className="px-6 pt-10 pb-6 flex items-center h-24 shrink-0 overflow-hidden">
          <div className={`flex items-center gap-3 transition-opacity duration-200 ${isCollapsed ? 'hidden opacity-0' : 'flex opacity-100'}`}>
            <Image src="/images/Icon.png" alt="Japan Arena Logo" width={40} height={40} className="w-10 h-10 object-contain drop-shadow-sm" priority />
            <div>
              <h1 className="text-xl sf-display-heavy tracking-tight text-[#1D1D1F] leading-none">Japan Arena</h1>
              <div className="mt-1 bg-[#FF3B30] text-white text-[9px] px-2 py-0.5 rounded uppercase font-bold tracking-widest inline-block shadow-sm">
                Superadmin
              </div>
            </div>
          </div>
          <div className={`mx-auto shrink-0 ${isCollapsed ? 'flex' : 'hidden'}`}>
            <Image src="/images/Icon.png" alt="Logo" width={36} height={36} className="w-9 h-9 object-contain drop-shadow-sm" />
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-1.5 mt-4 overflow-y-auto scrollbar-hide pb-4">
          <p className={`px-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 transition-opacity ${isCollapsed ? 'opacity-0' : 'opacity-100'}`}>
            Platform Admin
          </p>
          {NAV.map((item) => {
            const active = isActive(item.href)
            const Icon = item.Icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center ${isCollapsed ? 'justify-center px-0' : 'px-3'} py-2.5 rounded-xl text-sm sf-display relative overflow-hidden transition-colors
                  ${active
                    ? 'bg-[#0071E3]/10 text-[#0071E3] font-bold'
                    : 'text-gray-600 hover:bg-black/5 hover:text-gray-900'}
                `}
                title={isCollapsed ? item.label : undefined}
              >
                {active && <div className="absolute left-0 top-[15%] h-[70%] w-[3px] bg-[#0071E3] rounded-r-md" />}
                <div className={`${isCollapsed ? '' : 'w-6'} flex justify-center shrink-0`}>
                  <Icon size={18} className={`transition-opacity ${active ? 'opacity-100' : 'opacity-70'}`} />
                </div>
                {!isCollapsed && <span className="ml-3 tracking-tight whitespace-nowrap">{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-black/5 bg-white/50 shrink-0">
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : ''} p-2 hover:bg-black/5 rounded-xl transition-colors relative mb-2`}>
            <div className="w-10 h-10 rounded-full bg-white border border-black/10 shrink-0 shadow-sm flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50">
              <span className="text-sm font-bold text-[#FF3B30]">SA</span>
            </div>
            {!isCollapsed && (
              <div className="ml-3 flex-1 min-w-0">
                <p className="text-[14px] sf-display truncate text-gray-900">{userName}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF3B30]" />
                  <p className="text-[11px] text-gray-500 font-medium">Superadmin</p>
                </div>
              </div>
            )}
          </div>
          <form action="/auth/logout" method="post">
            <button
              type="submit"
              className={`flex items-center justify-center gap-2 w-full py-2 bg-[#FF3B30]/10 text-[#FF3B30] text-[11px] font-bold rounded-lg hover:bg-[#FF3B30]/20 transition-colors ${isCollapsed ? 'px-0' : 'px-4'}`}
              title={isCollapsed ? 'Keluar' : undefined}
            >
              <LogOut size={14} />
              {!isCollapsed && <span>Keluar Sistem</span>}
            </button>
          </form>
        </div>
      </aside>

      {/* ─── Main Content ─────────────────────────────────────────── */}
      <main
        className={`flex-1 overflow-y-auto relative z-0 transition-all duration-300 ${
          mounted && isCollapsed ? 'md:ml-20' : 'md:ml-64'
        } w-full`}
      >
        {children}
      </main>
    </>
  )
}
