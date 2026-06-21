'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  LayoutDashboard, UserCheck, List, UserPlus, Receipt, Pill,
  ChevronLeft, LogOut,
} from 'lucide-react'

const NAV = [
  { href: '/receptionist',               Icon: LayoutDashboard, label: 'Dashboard'         },
  { href: '/receptionist/checkin',        Icon: UserCheck,       label: 'Check-in Pasien'   },
  { href: '/receptionist/antrian',        Icon: List,            label: 'Kelola Antrian'    },
  { href: '/receptionist/patients/new',   Icon: UserPlus,        label: 'Pasien Baru'       },
  { href: '/receptionist/dispensing',     Icon: Pill,            label: 'Obat & Resep'      },
  { href: '/receptionist/billing',        Icon: Receipt,         label: 'Billing'           },
]

function getInitials(name: string) {
  return (name ?? '').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?'
}

export default function ReceptionistSidebar({ userName }: { userName: string }) {
  const pathname                  = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('rec-sb-collapsed') === 'true'
    setCollapsed(saved)
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('sidebar-collapsed', collapsed)
    localStorage.setItem('rec-sb-collapsed', String(collapsed))
  }, [collapsed])

  const isActive = (href: string) =>
    href === '/receptionist' ? pathname === '/receptionist' : pathname.startsWith(href)

  return (
    <aside
      className={`fixed top-0 left-0 h-full z-50 shadow-2xl flex flex-col transition-all duration-300 ease-in-out ${
        collapsed ? 'w-16' : 'w-64'
      }`}
      style={{ background: 'linear-gradient(180deg, #0A2342 0%, #0f2d5c 60%, #1B4F8A 100%)' }}
    >
      {/* Brand */}
      <div
        className={`relative flex shrink-0 items-center justify-center border-b border-white/10 transition-all duration-300 ${collapsed ? 'h-16 px-2' : 'h-28 px-5'}`}
      >
        {collapsed ? (
          <img
            src="/logo-rocket-white.png"
            alt="Webzoka"
            className="h-9 w-auto shrink-0 object-contain"
          />
        ) : (
          <img
            src="/logo-wide-white.png"
            alt="Webzoka — Part of Japan Arena Corp"
            className="w-[200px] max-w-[86%] max-h-[72px] object-contain animate-fade-in"
          />
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 overflow-y-auto space-y-0.5">
        {NAV.map(item => {
          const active = isActive(item.href)
          return (
            <Link key={item.href} href={item.href} title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 rounded-xl text-sm font-semibold transition-all duration-150
                ${collapsed ? 'justify-center px-0 py-3' : 'px-3 py-2.5'}
                ${active ? 'bg-white text-[#0C2340]' : 'text-white/60 hover:bg-white/10 hover:text-white'}`}>
              <item.Icon size={17} className={`flex-shrink-0 ${active ? 'text-primary' : ''}`} />
              {!collapsed && <span className="flex-1 tracking-tight">{item.label}</span>}
              {!collapsed && active && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" />}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className={`border-t border-white/10 ${collapsed ? 'p-3' : 'p-4'} space-y-3`}>
        {!collapsed && (
          <div className="flex items-center gap-3 px-1">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-white text-xs font-black flex-shrink-0 shadow-md">
              {getInitials(userName)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-white truncate leading-tight">{userName}</p>
              <p className="text-[11px] text-white/40 truncate mt-0.5">Receptionist</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="flex justify-center">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-white text-xs font-black shadow-md" title={userName}>
              {getInitials(userName)}
            </div>
          </div>
        )}
        <div className="flex gap-2">
          {!collapsed && (
            <a href="/auth/logout"
              className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl text-xs font-bold text-white/40 hover:bg-white/10 hover:text-white/80 transition-all">
              <LogOut size={12} /> Keluar
            </a>
          )}
          {collapsed && (
            <a href="/auth/logout" title="Keluar"
              className="w-full flex items-center justify-center py-2 rounded-xl text-white/40 hover:bg-white/10 hover:text-white transition-all">
              <LogOut size={14} />
            </a>
          )}
        </div>
        <button onClick={() => setCollapsed(c => !c)}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-white/30 hover:bg-white/10 hover:text-white/60 transition-all text-xs font-bold"
          title={collapsed ? 'Perluas' : 'Perkecil'}>
          <ChevronLeft size={15} className={`transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} />
          {!collapsed && <span>Perkecil</span>}
        </button>
      </div>
    </aside>
  )
}
