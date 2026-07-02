'use client'

import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Sparkles, Building2, Tag, ClipboardList, ArrowRight } from 'lucide-react'
import type { OnboardingTrack } from '@/lib/onboarding/steps'

// ============================================================
// WelcomeModal — one-time first-run greeting (Orient phase).
// Presentational only: parent (OnboardingLauncher) owns open state + persistence.
// Only the admin persona sees onboarding in this portal, so copy is single-track.
// ============================================================

interface WelcomeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  track: OnboardingTrack
  userName: string
  onStartTour: () => void
  onSkip: () => void
}

const POINTS: { icon: React.ElementType; text: string }[] = [
  { icon: Building2, text: 'Atur cabang, dokter, dan jam praktik' },
  { icon: Tag, text: 'Susun tindakan & tarif untuk billing rapi' },
  { icon: ClipboardList, text: 'Kelola antrian dan kunjungan pasien' },
]

export function WelcomeModal({ open, onOpenChange, userName, onStartTour, onSkip }: WelcomeModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showClose={false}>
        {/* Icon badge */}
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0071E3]/10">
          <Sparkles className="h-6 w-6 text-[#0071E3]" strokeWidth={2} />
        </div>

        <div className="mt-4">
          <DialogTitle>
            Selamat datang di Portal Klinik
            {userName ? `, ${userName.split(' ')[0]}` : ''}
          </DialogTitle>
          <DialogDescription>
            Kami bantu siapkan klinikmu langkah demi langkah, supaya kamu bisa mulai melayani pasien hari ini.
          </DialogDescription>
        </div>

        {/* What you can do */}
        <ul className="mt-5 space-y-2.5">
          {POINTS.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-3 text-sm text-gray-700">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gray-50 text-gray-500">
                <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
              </span>
              {text}
            </li>
          ))}
        </ul>

        {/* Actions */}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            onClick={onSkip}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-100 sm:w-auto"
          >
            Lewati dulu
          </button>
          <button
            onClick={onStartTour}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0071E3] px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-[#005BB5] active:scale-[0.98]"
          >
            Mulai tur singkat
            <ArrowRight className="h-4 w-4" strokeWidth={2.2} />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
