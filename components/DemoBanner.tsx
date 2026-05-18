'use client'

import { useState } from 'react'
import { FlaskConical, X } from 'lucide-react'

export default function DemoBanner() {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 bg-amber-500 py-3 px-4">
      <div className="flex items-center justify-between max-w-6xl mx-auto gap-3">

        <div className="flex items-center gap-2 min-w-0">
          <FlaskConical size={16} className="text-amber-100 flex-shrink-0" />
          <span className="text-sm font-medium text-white whitespace-nowrap">
            Anda sedang menjelajahi akun demo.
          </span>
          <span className="hidden sm:inline text-xs text-amber-200 ml-1 truncate">
            Data tidak tersimpan permanen.
          </span>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <a
            href="/register"
            className="bg-white text-amber-600 font-black text-sm px-4 py-2 rounded-xl hover:bg-amber-50 transition-colors whitespace-nowrap"
          >
            Daftar Sekarang — Gratis 14 Hari →
          </a>
          <button
            onClick={() => setDismissed(true)}
            aria-label="Tutup banner"
            className="p-1.5 rounded-lg text-amber-100 hover:bg-amber-600 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

      </div>
    </div>
  )
}
