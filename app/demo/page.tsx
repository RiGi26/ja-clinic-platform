'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'

type Status = 'loading' | 'error'

export default function DemoPage() {
  const [status,   setStatus]   = useState<Status>('loading')
  const [errorMsg, setErrorMsg] = useState('')

  const runDemo = useCallback(async () => {
    setStatus('loading')
    setErrorMsg('')
    try {
      const res  = await fetch('/api/demo-clinic-login', { method: 'POST' })
      const data = await res.json() as { success?: boolean; redirectTo?: string; error?: string }
      if (data.success) {
        window.location.href = data.redirectTo ?? '/admin'
      } else {
        setErrorMsg(data.error ?? 'Demo gagal. Coba lagi.')
        setStatus('error')
      }
    } catch {
      setErrorMsg('Koneksi gagal. Coba lagi.')
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    void runDemo()
  }, [runDemo])

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4 px-4 text-center">
        <Image
          src="/images/Icon.png"
          alt="Japan Arena Corp"
          width={64} height={64}
          className="w-16 h-auto"
        />
        <p className="text-red-500 text-sm font-medium">{errorMsg}</p>
        <div className="flex gap-3 mt-2">
          <button
            onClick={() => void runDemo()}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-colors"
          >
            Coba Lagi
          </button>
          <a
            href="/auth/login"
            className="px-5 py-2.5 border border-gray-200 hover:border-gray-300 text-gray-600 text-sm font-bold rounded-xl transition-colors"
          >
            Login Manual →
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4">
      <Image
        src="/images/Icon.png"
        alt="Japan Arena Corp"
        width={64} height={64}
        className="w-16 h-auto"
      />
      <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      <p className="text-gray-500 text-sm">Menyiapkan demo klinik Anda...</p>
    </div>
  )
}
