'use client'

import { useState } from 'react'
import TopBar from '@/components/TopBar'
import { Search, Plus } from 'lucide-react'

const FILTERS = ['Semua', 'Aktif', 'Baru', 'Alumni']
const AVATAR_COLORS = [
  'from-cyan-400 to-blue-500','from-violet-400 to-purple-600',
  'from-emerald-400 to-teal-600','from-orange-400 to-red-500',
]
function avatarColor(name: string) {
  const sum = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return AVATAR_COLORS[sum % AVATAR_COLORS.length]
}
const STATUS_STYLE: Record<string, string> = {
  Aktif:'bg-green-50 text-green-600', Baru:'bg-cyan-50 text-cyan-600', Alumni:'bg-gray-100 text-gray-500',
}

export type Patient = {
  id:string; no_rm:string; full_name:string; phone:string|null
  gender:string|null; date_of_birth:string|null; status?:string
}

export default function PatientsClient({ patients }: { patients: Patient[] }) {
  const [filter, setFilter] = useState('Semua')
  const [search, setSearch] = useState('')

  const filtered = patients.filter(p => {
    const matchFilter = filter === 'Semua' || (p.status ?? 'Aktif') === filter
    const q = search.toLowerCase()
    return matchFilter && (!q || p.full_name.toLowerCase().includes(q) || p.no_rm.toLowerCase().includes(q))
  })

  function calcAge(dob: string | null) {
    if (!dob) return '—'
    return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 86400000)) + ' th'
  }

  return (
    <div className="min-h-screen bg-background">
      <TopBar title="Manajemen Pasien" subtitle={`${patients.length} pasien terdaftar`} showSearch={false} />
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Cari nama atau No. RM..."
              className="pl-11 pr-5 py-3 bg-white border border-gray-200 rounded-xl w-80 text-sm focus:outline-none focus:ring-2 focus:ring-primary shadow-sm" />
          </div>
          <a href="/admin/appointments/walkin"
            className="flex items-center gap-2 px-5 py-3 bg-primary text-white rounded-xl font-bold text-sm shadow-sm hover:bg-primary-hover transition-colors">
            <Plus size={16} /> Pasien Walk-in
          </a>
        </div>

        <div className="flex gap-2 mb-6">
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full font-bold text-sm transition-all ${filter === f ? 'bg-primary text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
              {f}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center shadow-sm">
            <p className="text-muted-foreground font-semibold text-sm">Belum ada data pasien</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(p => (
              <div key={p.id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all animate-fade-in-up">
                <div className="flex items-center gap-5">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${avatarColor(p.full_name)} flex items-center justify-center text-white font-black text-base flex-shrink-0`}>
                    {p.full_name.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase()}
                  </div>
                  <div className="flex-1 grid grid-cols-4 gap-4 items-center">
                    <div className="col-span-2">
                      <p className="font-black text-secondary text-sm">{p.full_name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{p.no_rm} · {calcAge(p.date_of_birth)} · {p.gender ?? '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-0.5">No. HP</p>
                      <p className="text-sm font-bold text-secondary">{p.phone ?? '—'}</p>
                    </div>
                    <div className="flex justify-end">
                      <span className={`px-3 py-1.5 rounded-full font-bold text-xs ${STATUS_STYLE[p.status ?? 'Aktif']}`}>
                        {p.status ?? 'Aktif'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
