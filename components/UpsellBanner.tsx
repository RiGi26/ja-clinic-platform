'use client'

import { useSearchParams } from 'next/navigation'
import { Lock, X } from 'lucide-react'
import { useState } from 'react'
import type { EntitlementKey } from '@/lib/entitlements'

const FEATURE_LABEL: Record<EntitlementKey, string> = {
  appointments:  'Antrian & Janji Temu',
  patients:      'Database Pasien',
  records:       'Rekam Medis',
  letters:       'Surat Keterangan',
  billing:       'Keuangan & Billing',
  pharmacy:      'Stok Obat (Apotek)',
  reports:       'Laporan Analitik',
  shifts:        'Jadwal Staf',
  notifications: 'Notifikasi WhatsApp',
  booking_link:  'Tautan Booking Online',
  white_label:   'Branding & Domain Sendiri',
}

/**
 * Shows a dismissible banner when a tier guard redirected here with ?upsell=<key>
 * (feature not in the clinic's package) or ?billing=<status> (subscription not in
 * good standing). Rendered inside the admin/receptionist layouts.
 */
export default function UpsellBanner() {
  const params = useSearchParams()
  const [dismissed, setDismissed] = useState(false)

  const upsell = params.get('upsell') as EntitlementKey | null
  const billing = params.get('billing')

  if (dismissed || (!upsell && !billing)) return null

  const message = upsell
    ? `Fitur “${FEATURE_LABEL[upsell] ?? upsell}” belum termasuk dalam paket langganan klinik Anda.`
    : 'Langganan klinik Anda sedang tidak aktif. Perbarui pembayaran untuk membuka kembali fitur ini.'

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-1.5rem)] max-w-2xl">
      <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl px-4 py-3 shadow-lg">
        <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
          <Lock size={16} className="text-amber-600" />
        </div>
        <p className="text-sm font-medium flex-1 leading-snug">{message}</p>
        <a
          href="/admin/langganan"
          className="shrink-0 bg-amber-600 text-white font-bold rounded-xl px-3.5 py-2 text-xs hover:bg-amber-700 transition-colors"
        >
          Tingkatkan Paket
        </a>
        <button
          onClick={() => setDismissed(true)}
          aria-label="Tutup pemberitahuan"
          className="shrink-0 p-1.5 text-amber-500 hover:text-amber-800 rounded-lg hover:bg-amber-100 transition-colors"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
