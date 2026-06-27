'use client'

type Props = {
  plan: string
  daysLeft: number | null
  isExpired: boolean
  isTrial: boolean
}

export default function ExpiredBanner({ isExpired, isTrial, daysLeft }: Props) {
  if (isExpired) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-red-500 text-white px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
        <span className="text-sm font-semibold text-center sm:text-left">
          ⚠️ Masa aktif klinik Anda telah berakhir. Pilih paket untuk melanjutkan.
        </span>
        <a
          href="/admin/langganan"
          className="shrink-0 bg-white text-red-600 font-bold rounded-xl px-4 py-2 text-sm hover:bg-red-50 transition-colors"
        >
          Perpanjang Langganan →
        </a>
      </div>
    )
  }

  if (isTrial && daysLeft !== null && daysLeft <= 7) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-amber-500 text-white px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
        <span className="text-sm font-semibold text-center sm:text-left">
          ⏳ Trial Anda berakhir dalam {daysLeft} hari. Pilih paket untuk melanjutkan.
        </span>
        <a
          href="/admin/langganan"
          className="shrink-0 bg-white text-amber-600 font-bold rounded-xl px-4 py-2 text-sm hover:bg-amber-50 transition-colors"
        >
          Perpanjang Sekarang →
        </a>
      </div>
    )
  }

  return null
}
