import { createAdminClient } from '@/lib/supabase/server'
import { Building2, Clock, AlertTriangle, CreditCard } from 'lucide-react'

export const dynamic = 'force-dynamic'

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso))
}

const PLAN_BADGE: Record<string, string> = {
  trial:  'bg-amber-100 text-amber-700',
  basic:  'bg-blue-100 text-blue-700',
  pro:    'bg-green-100 text-green-700',
  custom: 'bg-violet-100 text-violet-700',
}

export default async function SuperAdminDashboard() {
  const db  = createAdminClient()
  const now = new Date().toISOString()

  const [
    { count: totalActive },
    { count: trialActive },
    { count: trialExpired },
    { count: paid },
    { data: recent },
  ] = await Promise.all([
    db.from('clinics').select('*', { count: 'exact', head: true }).eq('is_active', true),
    db.from('clinics').select('*', { count: 'exact', head: true }).eq('plan', 'trial').eq('is_active', true).gt('plan_expires_at', now),
    db.from('clinics').select('*', { count: 'exact', head: true }).eq('plan', 'trial').eq('is_active', true).lt('plan_expires_at', now),
    db.from('clinics').select('*', { count: 'exact', head: true }).in('plan', ['basic', 'pro', 'custom']).eq('is_active', true),
    db.from('clinics').select('id, name, slug, plan, plan_expires_at, is_active, created_at').order('created_at', { ascending: false }).limit(10),
  ])

  const stats = [
    { label: 'Total Klinik Aktif', value: totalActive ?? 0,    Icon: Building2,     color: 'text-blue-600',   bg: 'bg-blue-50' },
    { label: 'Trial Aktif',        value: trialActive ?? 0,    Icon: Clock,         color: 'text-amber-600',  bg: 'bg-amber-50' },
    { label: 'Trial Expired',      value: trialExpired ?? 0,   Icon: AlertTriangle, color: 'text-red-600',    bg: 'bg-red-50' },
    { label: 'Klinik Berbayar',    value: paid ?? 0,           Icon: CreditCard,    color: 'text-green-600',  bg: 'bg-green-50' },
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-gray-900">Dashboard Platform</h1>
        <p className="text-gray-500 text-sm mt-1">Overview semua klinik yang menggunakan platform</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <div className={`w-11 h-11 rounded-xl ${s.bg} flex items-center justify-center mb-4`}>
              <s.Icon size={20} className={s.color} />
            </div>
            <p className="text-3xl font-black text-gray-900 mb-1">{s.value}</p>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Recent clinics */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-black text-gray-900 text-sm">Klinik Terbaru Bergabung</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Nama Klinik', 'Slug', 'Plan', 'Bergabung', 'Trial Habis', 'Status'].map(h => (
                  <th key={h} className="text-left text-[10px] uppercase tracking-widest font-bold text-gray-400 px-5 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(recent ?? []).map(c => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 font-bold text-gray-800">{c.name}</td>
                  <td className="px-5 py-3 font-mono text-xs text-gray-500">{c.slug}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize ${PLAN_BADGE[c.plan] ?? 'bg-gray-100 text-gray-600'}`}>
                      {c.plan}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-xs text-gray-500">{fmtDate(c.created_at)}</td>
                  <td className="px-5 py-3 text-xs text-gray-500">{c.plan_expires_at ? fmtDate(c.plan_expires_at) : '—'}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${c.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                      {c.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
