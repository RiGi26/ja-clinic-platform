'use client'

import { useState } from 'react'
import { FlaskConical, X, ArrowLeft } from 'lucide-react'

export default function DemoBanner() {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 bg-amber-500 py-2.5 px-4">
      <div className="flex items-center justify-between max-w-7xl mx-auto gap-3">

        <div className="flex items-center gap-2 min-w-0">
          <FlaskConical size={15} className="text-amber-100 flex-shrink-0" />
          <span className="text-sm font-semibold text-white whitespace-nowrap">Mode Demo</span>
          <span className="hidden sm:inline text-xs text-amber-200 truncate">
            · Data tidak tersimpan permanen
          </span>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <a
            href="/demo"
            className="flex items-center gap-1.5 text-amber-900 bg-amber-200/70 hover:bg-amber-200 text-xs font-bold px-3 py-1.5 rounded-xl transition-colors whitespace-nowrap"
          >
            <ArrowLeft size={12} /> Ganti Role
          </a>
          <a
            href="/register"
            className="bg-white text-amber-600 font-bold text-xs px-3 py-1.5 rounded-xl hover:bg-amber-50 transition-colors whitespace-nowrap"
          >
            Daftar Gratis →
          </a>
          <button
            onClick={() => setDismissed(true)}
            aria-label="Tutup banner"
            className="p-1.5 rounded-lg text-amber-100 hover:bg-amber-600 transition-colors"
          >
            <X size={14} />
          </button>
        </div>

      </div>
    </div>
  )
}
