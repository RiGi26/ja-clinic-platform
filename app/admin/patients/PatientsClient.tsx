'use client'

import { useState } from 'react'
import Link from 'next/link'
import TopBar from '@/components/TopBar'
import { Search, Plus, ChevronRight, Phone } from 'lucide-react'

const FILTERS = ['Semua', 'Aktif', 'Baru', 'Alumni', 'BPJS', 'Asuransi']
const AVATAR_COLORS = [
  'from-cyan-400 to-blue-500','from-violet-400 to-purple-600',
  'from-emerald-400 to-teal-600','from-orange-400 to-red-500',
]
function avatarColor(name: string) {
  const sum = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return AVATAR_COLORS[sum % AVATAR_COLORS.length]
}
const STATUS_STYLE: Record<string, string> = {
  Aktif:'bg-[#34C759]/10 text-[#34C759]', Baru:'bg-[#5AC8FA]/10 text-[#0071E3]', Alumni:'bg-gray-200 text-gray-600',
}

export type Patient = {
  id:string; no_rm:string; full_name:string; phone:string|null
  gender:string|null; date_of_birth:string|null; status?:string
  jenis_penjamin?: string | null
}

export default function PatientsClient({ patients }: { patients: Patient[] }) {
  const [filter, setFilter] = useState('Semua')
  const [search, setSearch] = useState('')

  const filtered = patients.filter(p => {
    const statusFilter = filter === 'BPJS' ? p.jenis_penjamin === 'bpjs'
      : filter === 'Asuransi' ? p.jenis_penjamin === 'asuransi'
      : filter === 'Semua' || (p.status ?? 'Aktif') === filter
    const q = search.toLowerCase()
    return statusFilter && (!q || p.full_name.toLowerCase().includes(q) || p.no_rm.toLowerCase().includes(q))
  })

  function calcAge(dob: string | null) {
    if (!dob) return '—'
    return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 86400000)) + ' th'
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      <TopBar title="Manajemen Pasien" subtitle={`${patients.length} pasien terdaftar`} showSearch={false} />
      <div className="p-4 md:p-8 max-w-7xl mx-auto animate-fade-in">
        
        {/* Actions & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6">
          <div className="relative group flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#0071E3] transition-colors" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Cari nama atau No. RM..."
              className="w-full pl-11 pr-4 py-3 min-h-[48px] bg-white border border-transparent rounded-2xl text-sm sf-display text-[#1D1D1F] focus:outline-none focus:border-[#0071E3]/30 focus:ring-4 focus:ring-[#0071E3]/10 transition-all duration-300 shadow-[0_2px_8px_rgba(0,0,0,0.02)]" />
          </div>
          <a href="/admin/appointments/walkin"
            className="flex items-center justify-center gap-2 px-6 py-3 min-h-[48px] bg-[#0071E3] text-white rounded-2xl font-bold text-sm sf-display shadow-[0_8px_20px_rgba(0,113,227,0.24)] hover:bg-[#005BB5] hover:shadow-[0_12px_25px_rgba(0,113,227,0.32)] transition-all active:scale-[0.98] shrink-0">
            <Plus size={18} /> Pasien Walk-in
          </a>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4 md:mx-0 md:px-0">
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-5 py-2.5 rounded-full font-bold text-sm sf-display transition-all whitespace-nowrap min-h-[44px] ${filter === f ? 'bg-[#1D1D1F] text-white shadow-md' : 'bg-white text-gray-500 border border-black/[0.04] hover:bg-gray-50 hover:text-gray-900 active:scale-95'}`}>
              {f}
            </button>
          ))}
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-3xl border border-black/[0.04] p-16 text-center shadow-[0_2px_12px_rgba(0,0,0,0.02)] animate-fade-up">
            <div className="w-16 h-16 bg-[#F5F5F7] rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="text-gray-400 w-8 h-8" />
            </div>
            <p className="text-[#1D1D1F] font-bold sf-display text-lg">Belum ada data pasien</p>
            <p className="text-[#86868B] text-sm mt-1">Sesuaikan filter atau kata kunci pencarian Anda.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtered.map((p, idx) => (
              <div key={p.id} className="bg-white rounded-3xl p-5 border border-black/[0.03] apple-shadow hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] transition-all animate-fade-up flex flex-col justify-between group" style={{ animationDelay: `${idx * 0.05}s` }}>
                
                <div className="flex items-start gap-4 mb-4">
                  <div className={`w-14 h-14 rounded-[20px] bg-gradient-to-br ${avatarColor(p.full_name)} flex items-center justify-center text-white font-black text-lg flex-shrink-0 shadow-[0_4px_12px_rgba(0,0,0,0.1)] group-hover:scale-105 transition-transform`}>
                    {p.full_name.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                       <p className="font-bold sf-display text-[#1D1D1F] text-base truncate">{p.full_name}</p>
                       <span className={`shrink-0 px-2.5 py-1 rounded-md font-bold text-[10px] uppercase tracking-wider ${STATUS_STYLE[p.status ?? 'Aktif']}`}>
                          {p.status ?? 'Aktif'}
                       </span>
                    </div>
                    <p className="text-xs text-[#86868B] sf-display mt-0.5 truncate">{p.no_rm} · {calcAge(p.date_of_birth)} · {p.gender ?? '—'}</p>
                    
                    {p.jenis_penjamin && p.jenis_penjamin !== 'umum' && (
                      <div className="mt-2">
                         <span className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${p.jenis_penjamin === 'bpjs' ? 'bg-[#5AC8FA]/10 text-[#0071E3]' : 'bg-purple-500/10 text-purple-600'}`}>
                           {p.jenis_penjamin}
                         </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-black/[0.04]">
                  <div className="flex items-center gap-2 text-sm sf-display font-medium text-[#475569]">
                    <div className="w-8 h-8 rounded-full bg-[#F5F5F7] flex items-center justify-center">
                      <Phone size={14} className="text-gray-400" />
                    </div>
                    {p.phone ?? '—'}
                  </div>
                  <Link href={`/admin/patients/${p.id}`}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#F5F5F7] hover:bg-[#E8E8ED] text-[#1D1D1F] rounded-xl text-xs font-bold sf-display transition-colors active:scale-95 group-hover:bg-[#0071E3] group-hover:text-white">
                    Detail <ChevronRight size={14} className="transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
