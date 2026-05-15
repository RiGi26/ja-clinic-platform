'use client'

import { useState } from 'react'
import { Activity } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'Login gagal')
      setLoading(false)
      return
    }

    window.location.href = data.redirectTo ?? '/admin'
  }

  return (
    <div className="min-h-screen bg-[#F0F9FF] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-[#0891B2] flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Activity size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-black text-[#0C2340] tracking-tight">Clinic Platform</h1>
          <p className="text-sm text-gray-400 mt-1">Masuk ke akun Anda</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-[20px] border border-gray-100 p-7 shadow-card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="nama@klinik.com"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0891B2] focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0891B2] focus:border-transparent transition-all"
              />
            </div>

            {error && (
              <p className="text-xs text-red-500 font-medium bg-red-50 px-3 py-2 rounded-lg">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#0891B2] hover:bg-[#0e7490] text-white font-black rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow-sm"
            >
              {loading ? 'Memproses...' : 'Masuk'}
            </button>
          </form>
        </div>

      </div>
    </div>
  )
}
