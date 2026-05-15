'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  LayoutDashboard, Users, Calendar, CreditCard, Settings,
  Clock, FileText, Activity, User, ChevronLeft, LogOut,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type Role = 'admin' | 'doctor' | 'patient'

type NavItem = { href: string; Icon: LucideIcon; label: string }

const NAV: Record<Role, NavItem[]> = {
  admin: [
    { href: '/admin',          Icon: LayoutDashboard, label: 'Dashboard'        },
    { href: '/admin/patients', Icon: Users,           label: 'Manajemen Pasien' },
    { href: '/admin/schedule', Icon: Calendar,        label: 'Jadwal Dokter'    },
    { href: '/admin/billing',  Icon: CreditCard,      label: 'Billing'          },
    { href: '/admin/settings', Icon: Settings,        label: 'Pengaturan'       },
  ],
  doctor: [
    { href: '/doctor',         Icon: LayoutDashboard, label: 'Dashboard'     },
    { href: '/doctor/queue',   Icon: Clock,           label: 'Antrian Pasien'},
    { href: '/doctor/records', Icon: FileText,        label: 'Rekam Medis'   },
    { href: '/doctor/schedule',Icon: Calendar,        label: 'Jadwal Saya'   },
  ],
  patient: [
    { href: '/patient',         Icon: LayoutDashboard, label: 'Dashboard'         },
    { href: '/patient/booking', Icon: Calendar,        label: 'Buat Appointment'  },
    { href: '/patient/records', Icon: Activity,        label: 'Rekam Medis'       },
    { href: '/patient/profile', Icon: User,            label: 'Profil'            },
  ],
}

const ROLE_LABEL: Record<Role, string> = {
  admin:   'Admin Portal',
  doctor:  'Doctor Portal',
  patient: 'Patient Portal',
}

function getInitials(name: string) {
  return (name ?? '').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?'
}

type Props = {
  role      : Role
  userName  : string
  userSub?  : string
}

export default function ClinicSidebar({ role, userName, userSub }: Props) {
  const pathname                    = usePathname()
  const [collapsed, setCollapsed]   = useState(false)

  // Persist collapse state
  useEffect(() => {
    const saved = localStorage.getItem('clinic-sb-collapsed') === 'true'
    setCollapsed(saved)
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('sidebar-collapsed', collapsed)
    localStorage.setItem('clinic-sb-collapsed', String(collapsed))
  }, [collapsed])

  const isActive = (href: string) =>
    href === `/${role}` ? pathname === `/${role}` : pathname.startsWith(href)

  const items = NAV[role]

  return (
    <aside
      className={`fixed top-0 left-0 h-full z-50 shadow-2xl flex flex-col transition-all duration-300 ease-in-out ${
        collapsed ? 'w-16' : 'w-64'
      }`}
      style={{ background: 'linear-gradient(180deg, #0A2342 0%, #0f2d5c 60%, #1B4F8A 100%)' }}
    >
      {/* Logo / Brand */}
      <div className={`border-b border-white/10 flex items-center h-[72px] ${
        collapsed ? 'justify-center px-2' : 'px-5'
      }`}>
        <Link
          href={`/${role === 'patient' ? 'patient' : role === 'doctor' ? 'doctor' : 'admin'}`}
          className="flex items-center gap-3"
        >
          <Image
            src="/images/Icon.png"
            alt="Japan Arena Corp"
            width={48} height={48}
            className="w-12 h-12 object-contain flex-shrink-0"
            priority
          />
          {!collapsed && (
            <div>
              <p className="text-white font-black text-sm leading-tight tracking-tight">
                Clinic Platform
              </p>
              <p className="text-white/40 text-[11px] font-medium mt-0.5">
                by Japan Arena Corp
              </p>
            </div>
          )}
        </Link>
        {collapsed && (
          <div className="hidden">{/* spacer */}</div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 overflow-y-auto space-y-0.5">
        {items.map(item => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 rounded-xl text-sm font-semibold transition-all duration-150
                ${collapsed ? 'justify-center px-0 py-3' : 'px-3 py-2.5'}
                ${active
                  ? 'bg-white text-[#0C2340]'
                  : 'text-white/60 hover:bg-white/10 hover:text-white'
                }`}
            >
              <item.Icon size={17} className={`flex-shrink-0 ${active ? 'text-primary' : ''}`} />
              {!collapsed && <span className="flex-1 tracking-tight">{item.label}</span>}
              {!collapsed && active && (
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" />
              )}
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
              {userSub && <p className="text-[11px] text-white/40 truncate mt-0.5">{userSub}</p>}
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
            <a
              href="/auth/logout"
              className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl text-xs font-bold text-white/40 hover:bg-white/10 hover:text-white/80 transition-all"
            >
              <LogOut size={12} /> Keluar
            </a>
          )}
          {collapsed && (
            <a
              href="/auth/logout"
              title="Keluar"
              className="w-full flex items-center justify-center py-2 rounded-xl text-white/40 hover:bg-white/10 hover:text-white transition-all"
            >
              <LogOut size={14} />
            </a>
          )}
        </div>

        {/* Collapse toggle — desktop */}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-white/30 hover:bg-white/10 hover:text-white/60 transition-all text-xs font-bold"
          title={collapsed ? 'Perluas sidebar' : 'Perkecil sidebar'}
        >
          <ChevronLeft
            size={15}
            className={`transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`}
          />
          {!collapsed && <span>Perkecil</span>}
        </button>
      </div>
    </aside>
  )
}
