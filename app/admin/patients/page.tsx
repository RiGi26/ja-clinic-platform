'use client'

import { useState } from 'react'
import TopBar from '@/components/TopBar'
import { Search, Filter, Plus } from 'lucide-react'

const PATIENTS = [
  { id: 1, name: 'Andi Wijaya',    noRM: 'RM-2024-001', age: 32, gender: 'Laki-laki',  doctor: 'Dr. Sarah Putri',  lastVisit: '12 Mei 2026', status: 'Aktif',  avatar: 'AW' },
  { id: 2, name: 'Siti Nurhaliza', noRM: 'RM-2024-002', age: 28, gender: 'Perempuan',   doctor: 'Dr. Budi Santoso', lastVisit: '11 Mei 2026', status: 'Aktif',  avatar: 'SN' },
  { id: 3, name: 'Rudi Hartono',   noRM: 'RM-2024-003', age: 45, gender: 'Laki-laki',  doctor: 'Dr. Sarah Putri',  lastVisit: '10 Mei 2026', status: 'Alumni', avatar: 'RH' },
  { id: 4, name: 'Maya Lestari',   noRM: 'RM-2024-004', age: 35, gender: 'Perempuan',   doctor: 'Dr. Ahmad Fauzi',  lastVisit: '15 Mei 2026', status: 'Baru',   avatar: 'ML' },
  { id: 5, name: 'Budi Setiawan',  noRM: 'RM-2024-005', age: 52, gender: 'Laki-laki',  doctor: 'Dr. Sarah Putri',  lastVisit: '08 Mei 2026', status: 'Aktif',  avatar: 'BS' },
]

const FILTERS = ['Semua', 'Aktif', 'Baru', 'Alumni']

const AVATAR_COLORS = [
  'from-cyan-400 to-blue-500',
  'from-violet-400 to-purple-600',
  'from-emerald-400 to-teal-600',
  'from-orange-400 to-red-500',
  'from-pink-400 to-rose-600',
]

function avatarColor(name: string) {
  const sum = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return AVATAR_COLORS[sum % AVATAR_COLORS.length]
}

const STATUS_STYLE: Record<string, string> = {
  Aktif:  'bg-success/10 text-success',
  Baru:   'bg-primary/10 text-primary',
  Alumni: 'bg-gray-100 text-gray-500',
}

export default function PatientsPage() {
  const [filter, setFilter] = useState('Semua')
  const [search, setSearch] = useState('')

  const filtered = PATIENTS.filter(p => {
    const matchFilter = filter === 'Semua' || p.status === filter
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
                        p.noRM.toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  return (
    <div className="min-h-screen bg-background">
      <TopBar title="Manajemen Pasien" subtitle="Kelola data pasien klinik" showSearch={false} />

      <div className="p-8">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Cari nama pasien atau No. RM..."
                className="pl-11 pr-5 py-3 bg-white border border-gray-200 rounded-xl w-80 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
              />
            </div>
            <button className="flex items-center gap-2 px-4 py-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-sm text-sm font-bold text-gray-600">
              <Filter size={16} /> Filter
            </button>
          </div>
          <button className="flex items-center gap-2 px-5 py-3 bg-primary text-white rounded-xl hover:bg-primary-hover transition-colors shadow-sm font-bold text-sm">
            <Plus size={16} /> Tambah Pasien
          </button>
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 mb-6">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full font-bold text-sm transition-all ${
                filter === f
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="space-y-3">
          {filtered.map(p => (
            <div
              key={p.id}
              className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer animate-fade-in-up"
            >
              <div className="flex items-center gap-5">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${avatarColor(p.name)} flex items-center justify-center text-white font-black text-base flex-shrink-0`}>
                  {p.avatar}
                </div>
                <div className="flex-1 grid grid-cols-5 gap-4 items-center">
                  <div className="col-span-2">
                    <p className="font-black text-secondary text-sm">{p.name}</p>
                    <p className="text-xs text-muted-foreground font-semibold mt-0.5">{p.noRM} · {p.age} th · {p.gender}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-0.5">Dokter</p>
                    <p className="text-sm font-bold text-secondary">{p.doctor}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-0.5">Kunjungan Terakhir</p>
                    <p className="text-sm font-bold text-secondary">{p.lastVisit}</p>
                  </div>
                  <div className="flex justify-end">
                    <span className={`px-3 py-1.5 rounded-full font-bold text-xs ${STATUS_STYLE[p.status]}`}>
                      {p.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
