'use client'

import { ReactNode, useState, useEffect } from 'react'
import ClinicSidebar from './ClinicSidebar'

interface ClinicClientLayoutProps {
  children: ReactNode
  role: 'admin' | 'doctor' | 'patient' | 'receptionist'
  userName: string
  userSub?: string
}

export default function ClinicClientLayout({ children, role, userName, userSub }: ClinicClientLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('clinic-sb-collapsed') === 'true'
    setIsCollapsed(saved)
    setMounted(true)
  }, [])

  const handleSetCollapsed = (v: boolean) => {
    setIsCollapsed(v)
    localStorage.setItem('clinic-sb-collapsed', String(v))
  }

  return (
    <>
      <ClinicSidebar
        role={role}
        userName={userName}
        userSub={userSub}
        isCollapsed={isCollapsed}
        setIsCollapsed={handleSetCollapsed}
      />

      <main 
        className={`flex-1 overflow-y-auto relative z-0 transition-all duration-300 ${
          mounted && isCollapsed ? 'md:ml-20' : 'md:ml-64'
        } w-full`}
      >
        <div className="pt-16 px-5 pb-5 md:p-10 w-full max-w-7xl mx-auto animate-fade-in">
          {children}
        </div>
      </main>
    </>
  )
}
