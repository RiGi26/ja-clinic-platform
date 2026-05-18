'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, X } from 'lucide-react'

export type Treatment = {
  id: string; name: string; category: string; price: number; description: string | null
}

function fmtRupiah(n: number) {
  return 'Rp ' + n.toLocaleString('id-ID')
}

const CAT_LABEL: Record<string, string> = {
  umum: 'Umum', tindakan: 'Tindakan', laboratorium: 'Lab', obat: 'Obat', lainnya: 'Lainnya',
}

export default function TreatmentPicker({
  onSelect,
  placeholder = 'Cari tindakan atau layanan...',
}: {
  onSelect: (treatment: Treatment) => void
  clinicId?: string  // kept for API compatibility, not used (auth server-side)
  placeholder?: string
}) {
  const [treatments, setTreatments] = useState<Treatment[]>([])
  const [search, setSearch]         = useState('')
  const [open, setOpen]             = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/admin/treatments?active=true')
      .then(r => r.json())
      .then((d: { treatments?: Treatment[] }) => setTreatments(d.treatments ?? []))
      .catch(() => {})
  }, [])

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = treatments.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    CAT_LABEL[t.category]?.toLowerCase().includes(search.toLowerCase())
  )

  function select(t: Treatment) {
    onSelect(t)
    setSearch('')
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center gap-2 px-3 py-2.5 border border-gray-200 rounded-xl bg-white focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent transition-all">
        <Search size={14} className="text-gray-400 flex-shrink-0" />
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="flex-1 text-sm focus:outline-none bg-transparent"
        />
        {search && (
          <button onClick={() => { setSearch(''); setOpen(false) }} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={13} />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-xl z-20 max-h-56 overflow-y-auto mt-1">
          {filtered.length === 0 ? (
            <p className="px-4 py-3 text-sm text-gray-400 text-center">
              {treatments.length === 0 ? 'Belum ada tindakan di katalog' : 'Tidak ditemukan'}
            </p>
          ) : (
            filtered.map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => select(t)}
                className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors text-left border-b border-gray-50 last:border-0"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-secondary truncate">{t.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {CAT_LABEL[t.category] ?? t.category}
                    {t.description ? ` · ${t.description}` : ''}
                  </p>
                </div>
                <p className="text-sm font-black text-primary ml-3 flex-shrink-0">{fmtRupiah(t.price)}</p>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
