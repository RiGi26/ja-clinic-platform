'use client'

import { useEffect, useRef } from 'react'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'
import type { OnboardingTrack } from '@/lib/onboarding/steps'
import { preemptDriver, registerDriver, releaseDriver } from '@/lib/onboarding/driver-guard'
import { firstVisible } from '@/lib/onboarding/visible'

// ============================================================
// ProductTour — driver.js coachmark tour, mobile-safe.
// Loaded via next/dynamic(ssr:false) from OnboardingLauncher, so driver.js + CSS
// stay out of the initial bundle. Runs whenever `runToken` increments.
//
// Each logical step points at a data-tour KEY. Desktop resolves to the sidebar;
// on mobile the sidebar drawer is translated off-screen, so keys are ALSO placed
// on always-visible dashboard elements (checklist card, "Daftarkan Pasien" CTA)
// and firstVisible() (viewport-aware) picks the anchor the user can actually
// reach. Steps with no visible anchor are silently skipped.
// ============================================================

interface TourStep {
  key: string
  title: string
  description: string
}

const OWNER_TOUR: TourStep[] = [
  {
    key: 'onboarding-checklist',
    title: 'Misi Pertama',
    description: 'Ikuti daftar singkat ini untuk menyiapkan klinikmu. Progresnya tersimpan otomatis.',
  },
  {
    key: 'nav-locations',
    title: 'Cabang',
    description: 'Mulai di sini — daftarkan cabang/lokasi praktik klinikmu.',
  },
  {
    key: 'nav-treatments',
    title: 'Tindakan & Tarif',
    description: 'Susun daftar tindakan dan tarifnya, jadi billing rapi sejak pasien pertama.',
  },
  {
    key: 'nav-appointments',
    title: 'Antrian Live',
    description: 'Kunjungan pasien masuk ke sini — daftar, panggil, dan selesaikan dari satu layar.',
  },
  {
    key: 'nav-settings',
    title: 'Pengaturan',
    description: 'Kelola daftar dokter, profil klinik, dan preferensi lainnya di sini.',
  },
]

interface ProductTourProps {
  runToken: number
  track: OnboardingTrack
  onDone: () => void
}

export function ProductTour({ runToken, track, onDone }: ProductTourProps) {
  const lastRun = useRef(0)

  useEffect(() => {
    if (runToken <= 0 || runToken === lastRun.current) return
    lastRun.current = runToken

    // Only the admin persona has a tour in this portal.
    const defs = track === 'owner' ? OWNER_TOUR : []
    const steps = defs
      .map((s) => {
        const el = firstVisible(`[data-tour="${s.key}"]`)
        return el ? { element: el, popover: { title: s.title, description: s.description } } : null
      })
      .filter((s): s is NonNullable<typeof s> => s !== null)

    if (steps.length === 0) {
      onDone()
      return
    }

    let finished = false
    const finish = () => {
      if (finished) return
      finished = true
      onDone()
    }

    const handle = { destroy: () => d.destroy() }
    const d = driver({
      showProgress: true,
      allowClose: true,
      overlayColor: 'rgba(2, 6, 23, 0.55)',
      nextBtnText: 'Lanjut',
      prevBtnText: 'Kembali',
      doneBtnText: 'Selesai',
      progressText: '{{current}} / {{total}}',
      popoverClass: 'ja-tour',
      onDestroyed: () => {
        releaseDriver(handle)
        finish()
      },
    })

    // The tour is an explicit user action — tear down any coachmark that's showing
    // (driver.js is a module-global singleton; two live instances break each other),
    // then hold the slot so coachmarks defer while the tour runs.
    preemptDriver()
    registerDriver(handle)
    d.setSteps(steps)
    d.drive()

    return () => {
      if (d.isActive()) d.destroy()
    }
  }, [runToken, track, onDone])

  return null
}
