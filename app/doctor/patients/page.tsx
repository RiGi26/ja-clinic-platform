'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, Users, ChevronRight, Calendar } from 'lucide-react'

type PatientRow = {
  patient_id      : string
  full_name       : string
  no_rm           : string
  phone           : string | null
  total_kunjungan : number
  kunjungan_terakhir : string
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function DoctorPatientsPage() {
  const [patients, setPatients] = useState<PatientRow[]>([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [error,    setError]    = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res  = await fetch('/api/doctor/patients')
      if (!res.ok) throw new Error('Gagal memuat data pasien')
      const data = await res.json() as { patients: PatientRow[] }
      setPatients(data.patients ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = patients.filter(p =>
    p.full_name.toLowerCase().includes(search.toLowerCase()) ||
    p.no_rm.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-8 animate-fade-in">

      {/* Header */}
      <header>
        <p className="text-[12px] text-gray-500 mb-1.5 font-bold uppercase tracking-widest flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#0891B2]" />
          Riwayat Pasien
        </p>
        <h2 className="text-[36px] sf-display-heavy tracking-tight text-[#1D1D1F] leading-tight">
          Pasien Saya
        </h2>
        <p className="text-gray-500 text-sm mt-1">Semua pasien yang pernah Anda tangani</p>
      </header>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Cari nama atau No. RM..."
          className="w-full pl-10 pr-4 py-3.5 bg-white border border-black/[0.06] rounded-2xl text-[15px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0891B2]/20 focus:bg-white transition-all apple-shadow"
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-2xl px-5 py-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Patient List */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="bg-white rounded-[24px] p-5 apple-shadow border border-black/[0.03] animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gray-100 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-100 rounded w-1/3" />
                  <div className="h-3 bg-gray-100 rounded w-1/4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-[28px] p-16 text-center apple-shadow border border-black/[0.03]">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users size={28} className="text-gray-300" />
          </div>
          <p className="text-gray-500">
            {search ? 'Tidak ada pasien yang cocok' : 'Belum ada riwayat pasien'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest px-1">
            {filtered.length} pasien ditemukan
          </p>
          {filtered.map(p => (
            <a
              key={p.patient_id}
              href={`/doctor/patients/${p.patient_id}`}
              className="block bg-white rounded-[24px] p-5 apple-shadow border border-black/[0.03] hover:scale-[1.01] transition-all group"
            >
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className="w-12 h-12 rounded-2xl bg-cyan-50 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                  <span className="text-[#0891B2] font-bold text-sm">
                    {p.full_name.split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase()}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="sf-display text-[16px] text-gray-900 truncate">{p.full_name}</p>
                    <span className="text-[11px] text-gray-400 font-mono bg-gray-50 px-2 py-0.5 rounded flex-shrink-0">{p.no_rm}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[13px] text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar size={12} />
                      <span>Terakhir {fmtDate(p.kunjungan_terakhir)}</span>
                    </div>
                    <span>·</span>
                    <span className="font-bold text-[#0891B2]">{p.total_kunjungan}× kunjungan</span>
                  </div>
                </div>

                <ChevronRight size={18} className="text-gray-300 group-hover:text-[#0891B2] transition-colors flex-shrink-0" />
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
