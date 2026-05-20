'use client'

import { useState, useEffect, useCallback } from 'react'
import { TrendingUp, TrendingDown, Users, Pill, Clock, ChevronLeft, ChevronRight } from 'lucide-react'

type Stats = {
  total_pasien      : number
  pasien_baru       : number
  pasien_kembali    : number
  total_resep       : number
  total_pasien_lalu : number
  growth_pct        : number
  top_keluhan       : { keluhan: string; count: number }[]
  daily_counts      : { date: string; count: number }[]
  jam_tersibuk      : string
}

function fmtMonth(yr: number, mo: number) {
  return new Date(yr, mo - 1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-100 rounded-xl ${className ?? ''}`} />
}

export default function DoctorStats() {
  const now         = new Date()
  const [year,  setYear]  = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [stats,    setStats]    = useState<Stats | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')

  const monthStr = `${year}-${String(month).padStart(2, '0')}`
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1

  const fetchStats = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res  = await fetch(`/api/doctor/stats?month=${monthStr}`)
      if (!res.ok) throw new Error('Gagal memuat statistik')
      const data = await res.json() as Stats
      setStats(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setLoading(false)
    }
  }, [monthStr])

  useEffect(() => { fetchStats() }, [fetchStats])

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (isCurrentMonth) return
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
  }

  const maxDaily  = stats ? Math.max(...stats.daily_counts.map(d => d.count), 1) : 1
  const todayDate = now.toISOString().split('T')[0]
  const totalKeluhan = stats?.top_keluhan.reduce((s, k) => s + k.count, 0) ?? 1

  return (
    <section className="space-y-6">

      {/* ─── Header + Month Picker ────────────────────────────── */}
      <div className="flex items-center justify-between px-1">
        <h3 className="text-[22px] sf-display-heavy tracking-tight text-[#1D1D1F]">
          Statistik Bulanan
        </h3>
        <div className="flex items-center gap-2 bg-white border border-black/[0.06] rounded-2xl px-3 py-2 apple-shadow">
          <button onClick={prevMonth} className="p-1 text-gray-400 hover:text-gray-700 transition-colors">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm sf-display text-gray-700 min-w-[120px] text-center">
            {fmtMonth(year, month)}
          </span>
          <button
            onClick={nextMonth}
            disabled={isCurrentMonth}
            className="p-1 text-gray-400 hover:text-gray-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-2xl px-5 py-4 text-sm text-red-600 font-medium">
          {error} — <button onClick={fetchStats} className="underline">Coba lagi</button>
        </div>
      )}

      {/* ─── Row 1: 4 Metric Cards ────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Total Pasien */}
        <div className="bg-white rounded-[28px] p-5 apple-shadow border border-black/[0.03]">
          <div className="w-10 h-10 rounded-xl bg-cyan-50 flex items-center justify-center mb-3">
            <Users size={18} className="text-[#0891B2]" />
          </div>
          <p className="text-gray-400 text-[10px] uppercase tracking-widest font-bold mb-1">Total Pasien</p>
          {loading ? <Skeleton className="h-8 w-16 mb-2" /> : (
            <p className="text-3xl sf-display-heavy text-[#1D1D1F] tabular-nums leading-none mb-2">
              {stats?.total_pasien ?? 0}
            </p>
          )}
          {loading ? <Skeleton className="h-4 w-24" /> : stats && (
            <div className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full
              ${stats.growth_pct >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
              {stats.growth_pct >= 0
                ? <TrendingUp size={11} />
                : <TrendingDown size={11} />
              }
              {stats.growth_pct >= 0 ? '+' : ''}{stats.growth_pct}% vs bln lalu
            </div>
          )}
        </div>

        {/* Pasien Baru vs Kembali */}
        <div className="bg-white rounded-[28px] p-5 apple-shadow border border-black/[0.03]">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-3">
            <Users size={18} className="text-apple-blue" />
          </div>
          <p className="text-gray-400 text-[10px] uppercase tracking-widest font-bold mb-3">Pasien Baru / Kembali</p>
          {loading ? <Skeleton className="h-6 w-full mb-2" /> : stats && (
            <>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-gray-600 font-medium">Baru</span>
                <span className="text-gray-900 font-bold tabular-nums">{stats.pasien_baru}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
                <div
                  className="h-full bg-apple-blue rounded-full transition-all"
                  style={{ width: `${stats.total_pasien > 0 ? (stats.pasien_baru / stats.total_pasien) * 100 : 0}%` }}
                />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 font-medium">Kembali</span>
                <span className="text-gray-900 font-bold tabular-nums">{stats.pasien_kembali}</span>
              </div>
            </>
          )}
        </div>

        {/* Total Resep */}
        <div className="bg-white rounded-[28px] p-5 apple-shadow border border-black/[0.03]">
          <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center mb-3">
            <Pill size={18} className="text-purple-600" />
          </div>
          <p className="text-gray-400 text-[10px] uppercase tracking-widest font-bold mb-1">Resep Ditulis</p>
          {loading ? <Skeleton className="h-8 w-16" /> : (
            <p className="text-3xl sf-display-heavy text-[#1D1D1F] tabular-nums leading-none">
              {stats?.total_resep ?? 0}
            </p>
          )}
        </div>

        {/* Jam Tersibuk */}
        <div className="bg-white rounded-[28px] p-5 apple-shadow border border-black/[0.03]">
          <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center mb-3">
            <Clock size={18} className="text-orange-500" />
          </div>
          <p className="text-gray-400 text-[10px] uppercase tracking-widest font-bold mb-1">Jam Tersibuk</p>
          {loading ? <Skeleton className="h-8 w-28" /> : (
            <p className="text-2xl sf-display-heavy text-[#1D1D1F] tabular-nums leading-none">
              {stats?.jam_tersibuk ?? '-'}
            </p>
          )}
        </div>
      </div>

      {/* ─── Row 2: Bar Chart Pasien Per Hari ─────────────────── */}
      <div className="bg-white rounded-[28px] p-6 apple-shadow border border-black/[0.03]">
        <p className="text-[14px] sf-display-heavy text-[#1D1D1F] mb-5">Pasien per Hari</p>
        {loading ? (
          <Skeleton className="h-24 w-full" />
        ) : stats && (
          <div className="flex items-end gap-[3px] h-24 group/chart">
            {stats.daily_counts.map(({ date, count }) => {
              const isToday  = date === todayDate
              const heightPct = count > 0 ? Math.max((count / maxDaily) * 100, 6) : 2
              const dayNum   = parseInt(date.split('-')[2])
              return (
                <div key={date} className="relative flex-1 flex flex-col items-center justify-end h-full group/bar">
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 hidden group-hover/bar:flex
                    bg-gray-900 text-white text-[10px] font-bold px-2 py-1 rounded-lg whitespace-nowrap z-10 pointer-events-none">
                    {dayNum} — {count} pasien
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                  </div>
                  <div
                    style={{ height: `${heightPct}%` }}
                    className={`w-full rounded-t transition-all
                      ${count === 0 ? 'bg-gray-100' : isToday ? 'bg-[#0891B2]' : 'bg-[#0891B2]/30 group-hover/bar:bg-[#0891B2]/60'}
                    `}
                  />
                  {/* Day label every 5 days */}
                  {(dayNum % 5 === 1 || dayNum === stats.daily_counts.length) && (
                    <span className="absolute -bottom-5 text-[8px] text-gray-400 font-bold">{dayNum}</span>
                  )}
                </div>
              )
            })}
          </div>
        )}
        <div className="flex items-center gap-4 mt-8 text-[11px] text-gray-400 font-medium">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-[#0891B2]" />
            Hari ini
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-[#0891B2]/30" />
            Hari lain
          </div>
        </div>
      </div>

      {/* ─── Row 3: Top Keluhan ────────────────────────────────── */}
      {!loading && stats && stats.top_keluhan.length > 0 && (
        <div className="bg-white rounded-[28px] p-6 apple-shadow border border-black/[0.03]">
          <p className="text-[14px] sf-display-heavy text-[#1D1D1F] mb-5">Top 5 Keluhan Bulan Ini</p>
          <div className="space-y-4">
            {stats.top_keluhan.map(({ keluhan, count }, i) => {
              const pct = Math.round((count / totalKeluhan) * 100)
              return (
                <div key={i}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[13px] text-gray-700 font-medium truncate pr-3">{keluhan}</span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[11px] font-bold text-gray-400">{pct}%</span>
                      <span className="text-[12px] font-bold text-[#0891B2] tabular-nums">{count}×</span>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#0891B2] rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

    </section>
  )
}
