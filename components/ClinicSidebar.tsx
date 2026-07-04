'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  LayoutDashboard, Users, Calendar, CreditCard, Settings,
  Clock, FileText, Activity, User, ChevronLeft, LogOut,
  ClipboardList, BarChart3, Tag, FileCheck, Pill, CalendarCheck, ChevronRight,
  UserCheck, List, UserPlus, Receipt, Menu, X, LayoutGrid, Sparkles, Building2, Layers,
  HelpCircle,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { EntitlementKey } from '@/lib/entitlements'

type Role = 'admin' | 'doctor' | 'patient' | 'receptionist'

/** `ent` (optional) = the tier feature this item needs; hidden when the clinic lacks it. */
type NavItem = { href: string; Icon: LucideIcon; label: string; ent?: EntitlementKey }

const NAV_GROUPS: Record<Role, { label: string; items: NavItem[] }[]> = {
  admin: [
    {
      label: 'Ringkasan',
      items: [
        { href: '/admin',                 Icon: LayoutDashboard, label: 'Dashboard'          },
        { href: '/admin/appointments',    Icon: ClipboardList,   label: 'Antrian Live'       },
      ]
    },
    {
      label: 'Manajemen Data',
      items: [
        { href: '/admin/locations',       Icon: Building2,       label: 'Cabang'             },
        { href: '/admin/patients',        Icon: Users,           label: 'Database Pasien'    },
        { href: '/admin/schedule',        Icon: Calendar,        label: 'Jadwal Dokter'      },
        { href: '/admin/shifts',          Icon: CalendarCheck,   label: 'Jadwal Staf',        ent: 'shifts'   },
      ]
    },
    {
      label: 'Layanan & Stok',
      items: [
        { href: '/admin/treatments',      Icon: Tag,             label: 'Tindakan & Tarif'   },
        { href: '/admin/packages',        Icon: Layers,          label: 'Paket Sesi'         },
        { href: '/admin/medicines',       Icon: Pill,            label: 'Stok Obat (Apotek)', ent: 'pharmacy' },
        { href: '/admin/medical-letters', Icon: FileCheck,       label: 'Surat Keterangan'   },
      ]
    },
    {
      label: 'Keuangan & Sistem',
      items: [
        { href: '/admin/billing',         Icon: CreditCard,      label: 'Keuangan & Billing', ent: 'billing'  },
        { href: '/admin/laporan',         Icon: BarChart3,       label: 'Laporan Analitik',   ent: 'reports'  },
        { href: '/admin/langganan',       Icon: Sparkles,        label: 'Langganan'          },
        { href: '/admin/settings',        Icon: Settings,        label: 'Pengaturan'         },
      ]
    }
  ],
  doctor: [
    {
      label: 'Menu Utama',
      items: [
        { href: '/doctor',          Icon: LayoutDashboard, label: 'Dashboard'      },
        { href: '/doctor/queue',    Icon: Clock,           label: 'Antrian Pasien' },
        { href: '/doctor/records',  Icon: FileText,        label: 'Rekam Medis'    },
        { href: '/doctor/patients', Icon: Users,           label: 'Pasien Saya'    },
        { href: '/doctor/schedule', Icon: Calendar,        label: 'Jadwal Saya'    },
      ]
    }
  ],
  patient: [
    {
      label: 'Portal Pasien',
      items: [
        { href: '/patient',         Icon: LayoutDashboard, label: 'Dashboard'        },
        { href: '/patient/booking', Icon: Calendar,        label: 'Buat Appointment' },
        { href: '/patient/records', Icon: Activity,        label: 'Rekam Medis'      },
        { href: '/patient/profile', Icon: User,            label: 'Profil Saya'      },
      ]
    }
  ],
  receptionist: [
    {
      label: 'Front Desk',
      items: [
        { href: '/receptionist',              Icon: LayoutDashboard, label: 'Dashboard'       },
        { href: '/receptionist/checkin',      Icon: UserCheck,       label: 'Check-in Pasien' },
        { href: '/receptionist/antrian',      Icon: List,            label: 'Kelola Antrian'  },
        { href: '/receptionist/patients/new', Icon: UserPlus,        label: 'Pasien Baru'     },
      ]
    },
    {
      label: 'Pelayanan',
      items: [
        { href: '/receptionist/dispensing',   Icon: Pill,            label: 'Obat & Resep',   ent: 'pharmacy' },
        { href: '/receptionist/billing',      Icon: Receipt,         label: 'Billing',        ent: 'billing'  },
      ]
    }
  ],
}

// Onboarding tour anchors — the tour resolves these to whichever element is
// actually on screen (sidebar on desktop; dashboard elements on mobile).
const TOUR_KEYS: Record<string, string> = {
  '/admin':              'nav-dashboard',
  '/admin/locations':    'nav-locations',
  '/admin/treatments':   'nav-treatments',
  '/admin/appointments': 'nav-appointments',
  '/admin/settings':     'nav-settings',
}

const ROLE_LABEL: Record<Role, string> = {
  admin        : 'Administrator',
  doctor       : 'Dokter',
  patient      : 'Pasien',
  receptionist : 'Resepsionis',
}

function getInitials(name: string) {
  return (name ?? '').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?'
}

type Props = {
  role           : Role
  userName       : string
  userSub?       : string
  entitlements?  : EntitlementKey[]
  isCollapsed    : boolean
  setIsCollapsed : (v: boolean) => void
}

export default function ClinicSidebar({ role, userName, userSub, entitlements, isCollapsed, setIsCollapsed }: Props) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const isActive = (href: string) =>
    href === `/${role}` ? pathname === `/${role}` : pathname.startsWith(href)

  // Hide gated items the clinic's package doesn't include. When entitlements is
  // undefined (not passed) every item shows — the server-side guards are the real gate.
  const allowed = (item: NavItem) => !item.ent || !entitlements || entitlements.includes(item.ent)
  const groups = NAV_GROUPS[role]
    .map(g => ({ ...g, items: g.items.filter(allowed) }))
    .filter(g => g.items.length > 0)
  const pageTitle = groups.flatMap(g => g.items).find(i => isActive(i.href))?.label ?? 'Clinic Platform'

  // Shared nav items renderer
  const NavItems = ({ onClose }: { onClose?: () => void }) => (
    <div className="space-y-6">
      {groups.map((group, gIdx) => (
        <div key={gIdx} className="space-y-1">
          {!isCollapsed && (
            <p className="px-3 text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em] mb-2">
              {group.label}
            </p>
          )}
          {group.items.map((item) => {
            const active = isActive(item.href)
            const Icon = item.Icon
            return (
              <Link
                key={item.href}
                href={item.href}
                data-tour={TOUR_KEYS[item.href]}
                onClick={onClose}
                className={`flex items-center ${isCollapsed ? 'justify-center px-0' : 'px-3'} py-3 md:py-2 rounded-xl text-sm sf-display relative overflow-hidden transition-all duration-200
                  ${active
                    ? 'bg-[#0071E3]/10 text-[#0071E3] font-bold shadow-[0_2px_10px_rgba(0,113,227,0.05)]'
                    : 'text-gray-500 hover:bg-black/5 hover:text-gray-900'}
                `}
                title={isCollapsed ? item.label : undefined}
              >
                {active && <div className="absolute left-0 top-[20%] h-[60%] w-[3px] bg-[#0071E3] rounded-r-md" />}
                <div className={`${isCollapsed ? '' : 'w-6'} flex justify-center shrink-0`}>
                  <Icon size={18} className={`transition-opacity ${active ? 'opacity-100' : 'opacity-60'}`} />
                </div>
                {!isCollapsed && <span className="ml-3 tracking-tight whitespace-nowrap">{item.label}</span>}
              </Link>
            )
          })}
        </div>
      ))}
    </div>
  )

  return (
    <>
      {/* ─── Mobile Top Bar ───────────────────────────────────────── */}
      <header className="md:hidden fixed top-0 w-full h-14 bg-white/80 backdrop-blur-xl border-b border-black/5 z-30 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setMobileOpen(true)} aria-label="Buka menu navigasi" className="grid place-items-center h-11 w-11 -ml-2.5 text-gray-600 rounded-lg hover:bg-black/5">
            <Menu size={22} />
          </button>
          <Image src="/logo-rocket.png" alt="Webzoka" width={28} height={28} className="object-contain" />
          <h1 className="text-[17px] sf-display-heavy text-[#1D1D1F] truncate max-w-[180px]">{pageTitle}</h1>
        </div>
        <div className="flex items-center gap-1">
          {role === 'admin' && (
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('onboarding:replay-tour'))}
              data-coach="help-button"
              aria-label="Panduan — putar ulang tur"
              title="Panduan portal"
              className="grid place-items-center h-11 w-11 text-gray-500 rounded-lg hover:bg-black/5"
            >
              <HelpCircle size={20} />
            </button>
          )}
          <form action="/auth/logout" method="post">
            <button type="submit" aria-label="Keluar dari sistem" className="grid place-items-center h-11 w-11 text-[#FF3B30] rounded-lg hover:bg-red-50">
              <LogOut size={20} />
            </button>
          </form>
        </div>
      </header>

      {/* ─── Mobile Overlay ───────────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40 animate-fade-in"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ─── Mobile Drawer ────────────────────────────────────────── */}
      <aside
        className={`md:hidden fixed left-0 top-0 h-full w-72 apple-glass border-r border-black/5 z-50 flex flex-col transition-transform duration-500 cubic-bezier(0.16, 1, 0.3, 1) shadow-[4px_0_40px_rgba(0,0,0,0.1)]
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Drawer Header */}
        <div className="px-5 pt-8 pb-5 flex items-center justify-between h-24 shrink-0">
          <img src="/logo-wide-clean.png" alt="Webzoka — Part of Japan Arena Corp" className="w-[180px] max-w-[72%] max-h-[56px] object-contain" />
          <button onClick={() => setMobileOpen(false)} aria-label="Tutup menu navigasi" className="grid place-items-center h-11 w-11 -mr-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-black/5 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Drawer Nav */}
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto scrollbar-hide pb-8">
           <NavItems onClose={() => setMobileOpen(false)} />
        </nav>

        {/* Drawer Profile & Logout */}
        <div className="p-5 border-t border-black/5 bg-white/50 shrink-0">
          <div className="flex items-center p-2 rounded-xl mb-3">
            <div className="w-10 h-10 rounded-full bg-white border border-black/10 shrink-0 shadow-sm flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
              <span className="text-sm font-bold text-gray-600">{getInitials(userName)}</span>
            </div>
            <div className="ml-3 flex-1 min-w-0">
              <p className="text-[14px] sf-display truncate text-gray-900">{userName}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <p className="text-[11px] text-gray-500 font-medium">{userSub || ROLE_LABEL[role]}</p>
              </div>
            </div>
          </div>
          <form action="/auth/logout" method="post">
            <button type="submit" className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-[#FF3B30]/10 text-[#FF3B30] text-[12px] font-bold rounded-xl hover:bg-[#FF3B30]/20 transition-all active:scale-95">
              <LogOut size={14} /> Keluar dari Sistem
            </button>
          </form>
        </div>
      </aside>

      {/* ─── Desktop Sidebar ──────────────────────────────────────── */}
      <aside
        className={`hidden md:flex flex-col fixed left-0 top-0 h-full apple-glass border-r border-black/5 z-50 shrink-0 transition-all duration-500 cubic-bezier(0.16, 1, 0.3, 1) shadow-[4px_0_24px_rgba(0,0,0,0.02)]
        ${isCollapsed ? 'w-20' : 'w-64'}`}
      >
        {/* Collapse Toggle */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          aria-label={isCollapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'}
          aria-expanded={!isCollapsed}
          className="absolute -right-3 top-10 bg-white border border-black/10 rounded-full p-1.5 shadow-sm text-gray-500 hover:text-black hover:shadow-md z-[60] transform transition-all hover:scale-110 active:scale-90"
        >
          {isCollapsed ? <ChevronRight size={14} strokeWidth={2.5}/> : <ChevronLeft size={14} strokeWidth={2.5}/>}
        </button>

        {/* Logo */}
        <div
          className={`relative flex shrink-0 items-center justify-center border-b border-black/5 transition-all duration-300 ${isCollapsed ? 'h-16 px-2' : 'h-28 px-5'}`}
        >
          {isCollapsed ? (
            <img
              src="/logo-rocket.png"
              alt="Webzoka"
              className="h-9 w-auto shrink-0 object-contain"
            />
          ) : (
            <img
              src="/logo-wide-clean.png"
              alt="Webzoka — Part of Japan Arena Corp"
              className="w-[210px] max-w-[86%] max-h-[72px] object-contain animate-fade-in"
            />
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-1.5 mt-4 overflow-y-auto scrollbar-hide pb-4">
           <NavItems />
        </nav>

        {/* Profile & Logout */}
        <div className="p-4 border-t border-black/5 bg-white/50 shrink-0 space-y-1">
          {role === 'admin' && (
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('onboarding:replay-tour'))}
              data-coach="help-button"
              aria-label="Panduan — putar ulang tur"
              title="Panduan portal"
              className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 px-4'} py-2 rounded-xl text-[11px] font-bold text-gray-500 hover:bg-black/5 hover:text-gray-900 w-full transition-all`}
            >
              <HelpCircle size={14} />
              {!isCollapsed && <span>Panduan</span>}
            </button>
          )}
          <a
            href="https://www.webzoka.com"
            className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 px-4'} py-2 rounded-xl text-[11px] font-bold text-gray-500 hover:bg-black/5 hover:text-gray-900 transition-all`}
            title={isCollapsed ? 'Portal Utama' : undefined}
          >
            <LayoutGrid size={14} />
            {!isCollapsed && <span>Portal Utama</span>}
          </a>
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : ''} p-2 hover:bg-black/5 rounded-xl transition-colors relative mb-2 cursor-default group/profile`}>
            <div className="w-10 h-10 rounded-full bg-white border border-black/10 overflow-hidden shrink-0 shadow-sm flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 group-hover/profile:shadow-md transition-shadow">
              <span className="text-sm font-bold text-gray-600">{getInitials(userName)}</span>
            </div>
            {!isCollapsed && (
              <div className="ml-3 flex-1 min-w-0 animate-fade-in">
                <p className="text-[14px] sf-display truncate text-gray-900 font-semibold">{userName}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse" />
                  <p className="text-[11px] text-gray-500 font-medium truncate uppercase tracking-wider">{userSub || ROLE_LABEL[role]}</p>
                </div>
              </div>
            )}
          </div>
          <form action="/auth/logout" method="post">
            <button
              type="submit"
              className={`flex items-center justify-center gap-2 w-full py-2.5 bg-[#FF3B30]/10 text-[#FF3B30] text-[11px] font-bold rounded-xl hover:bg-[#FF3B30]/20 transition-all active:scale-95 ${isCollapsed ? 'px-0' : 'px-4'}`}
              title={isCollapsed ? 'Keluar' : undefined}
            >
              <LogOut size={14} />
              {!isCollapsed && <span>Keluar</span>}
            </button>
          </form>
        </div>
      </aside>
    </>
  )
}
