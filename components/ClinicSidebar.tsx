'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  LayoutDashboard, Users, Calendar, CreditCard, Settings,
  Clock, FileText, Activity, User, ChevronLeft, LogOut,
  ClipboardList, BarChart3, Tag, FileCheck, Pill, CalendarCheck, ChevronRight
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type Role = 'admin' | 'doctor' | 'patient'

type NavItem = { href: string; Icon: LucideIcon; label: string }

const NAV: Record<Role, NavItem[]> = {
  admin: [
    { href: '/admin',                     Icon: LayoutDashboard, label: 'Dashboard'        },
    { href: '/admin/appointments',        Icon: ClipboardList,   label: 'Antrian Live'     },
    { href: '/admin/patients',            Icon: Users,           label: 'Database Pasien'  },
    { href: '/admin/schedule',            Icon: Calendar,        label: 'Jadwal Dokter'    },
    { href: '/admin/billing',             Icon: CreditCard,      label: 'Keuangan & Billing'},
    { href: '/admin/treatments',          Icon: Tag,             label: 'Tindakan & Tarif' },
    { href: '/admin/medicines',           Icon: Pill,            label: 'Stok Obat (Apotek)'},
    { href: '/admin/medical-letters',     Icon: FileCheck,       label: 'Surat Keterangan' },
    { href: '/admin/shifts',              Icon: CalendarCheck,   label: 'Jadwal Staf'      },
    { href: '/admin/laporan',             Icon: BarChart3,       label: 'Laporan Analitik' },
    { href: '/admin/settings',            Icon: Settings,        label: 'Pengaturan'       },
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
    { href: '/patient/profile', Icon: User,            label: 'Profil Saya'       },
  ],
}

function getInitials(name: string) {
  return (name ?? '').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?'
}

type Props = {
  role           : Role
  userName       : string
  userSub?       : string
  isCollapsed    : boolean
  setIsCollapsed : (v: boolean) => void
}

export default function ClinicSidebar({ role, userName, userSub, isCollapsed, setIsCollapsed }: Props) {
  const pathname = usePathname()

  const isActive = (href: string) =>
    href === `/${role}` ? pathname === `/${role}` : pathname.startsWith(href)

  const items = NAV[role]

  return (
    <aside
      className={`hidden md:flex flex-col fixed left-0 top-0 h-full apple-glass border-r border-black/5 z-50 shrink-0 transition-all duration-300 shadow-[4px_0_24px_rgba(0,0,0,0.02)]
      ${isCollapsed ? 'w-20' : 'w-64'}`}
    >
      {/* Collapse Toggle */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-10 bg-white border border-black/10 rounded-full p-1.5 shadow-sm text-gray-400 hover:text-black hover:shadow-md z-30 transform transition-all hover:scale-110"
      >
        {isCollapsed ? <ChevronRight size={14} strokeWidth={2.5}/> : <ChevronLeft size={14} strokeWidth={2.5}/>}
      </button>

      {/* Logo Section */}
      <div className="px-6 pt-10 pb-6 flex items-center h-24 shrink-0 overflow-hidden">
        <div className={`flex items-center gap-3 transition-opacity duration-200 ${isCollapsed ? 'hidden opacity-0' : 'flex opacity-100'}`}>
          <Image 
            src="/images/Icon.png" 
            alt="Japan Arena Logo" 
            width={40} height={40} 
            className="w-10 h-10 object-contain drop-shadow-sm"
            priority
          />
          <div>
            <h1 className="text-xl sf-display-heavy tracking-tight text-[#1D1D1F] leading-none">Japan Arena</h1>
            <div className="mt-1 bg-gradient-to-r from-[#0071E3] to-[#42A1FF] text-white text-[9px] px-2 py-0.5 rounded uppercase font-bold tracking-widest inline-block shadow-sm">
              Clinic Platform
            </div>
          </div>
        </div>
        <div className={`mx-auto shrink-0 ${isCollapsed ? 'flex' : 'hidden'}`}>
          <Image 
            src="/images/Icon.png" 
            alt="Logo" 
            width={36} height={36} 
            className="w-9 h-9 object-contain drop-shadow-sm"
          />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1.5 mt-4 overflow-y-auto scrollbar-hide pb-4">
        <p className={`px-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 transition-opacity ${isCollapsed ? 'opacity-0' : 'opacity-100'}`}>
          {role.toUpperCase()} MENU
        </p>
        
        {items.map((item) => {
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
              {active && <div className="absolute left-0 top-[15%] h-[70%] w-[3px] bg-[#0071E3] rounded-r-md"></div>}
              <div className={`${isCollapsed ? '' : 'w-6'} flex justify-center shrink-0`}>
                <Icon size={18} className={`transition-opacity ${active ? 'opacity-100' : 'opacity-70'}`} />
              </div>
              {!isCollapsed && <span className="ml-3 tracking-tight whitespace-nowrap">{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Profile & Logout */}
      <div className="p-4 border-t border-black/5 bg-white/50 shrink-0">
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : ''} p-2 hover:bg-black/5 rounded-xl transition-colors relative mb-2`}>
          <div className="w-10 h-10 rounded-full bg-white border border-black/10 overflow-hidden shrink-0 shadow-sm flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
             <span className="text-sm font-bold text-gray-600">{getInitials(userName)}</span>
          </div>
          {!isCollapsed && (
            <div className="ml-3 flex-1 min-w-0">
              <p className="text-[14px] sf-display truncate text-gray-900">{userName}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                  <p className="text-[11px] text-gray-500 font-medium truncate">{userSub || 'Member'}</p>
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
            {!isCollapsed && <span>Keluar</span>}
          </button>
        </form>
      </div>
    </aside>
  )
}
