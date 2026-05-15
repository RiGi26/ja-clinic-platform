import TopBar from '@/components/TopBar'
import { DollarSign, Send, Download } from 'lucide-react'

const SUMMARY = [
  { label: 'Belum Bayar',       value: 'Rp 12.5M', count: 23  },
  { label: 'Lunas Bulan Ini',   value: 'Rp 45.2M', count: 147 },
  { label: 'Total Outstanding', value: 'Rp 18.3M', count: 31  },
]

const INVOICES = [
  { id: 'INV-2024-001', patient: 'Andi Wijaya',    noRM: 'RM-2024-001', date: '15 Mei 2026', amount: 'Rp 450.000', status: 'Lunas',   avatar: 'AW' },
  { id: 'INV-2024-002', patient: 'Siti Nurhaliza', noRM: 'RM-2024-002', date: '14 Mei 2026', amount: 'Rp 320.000', status: 'Pending', avatar: 'SN' },
  { id: 'INV-2024-003', patient: 'Rudi Hartono',   noRM: 'RM-2024-003', date: '14 Mei 2026', amount: 'Rp 580.000', status: 'Lunas',   avatar: 'RH' },
  { id: 'INV-2024-004', patient: 'Maya Lestari',   noRM: 'RM-2024-004', date: '13 Mei 2026', amount: 'Rp 750.000', status: 'Pending', avatar: 'ML' },
]

const AVATAR_COLORS = ['from-cyan-400 to-blue-500','from-violet-400 to-purple-600','from-emerald-400 to-teal-600','from-orange-400 to-red-500']

function avatarColor(name: string) {
  const sum = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return AVATAR_COLORS[sum % AVATAR_COLORS.length]
}

export const dynamic = 'force-dynamic'

export default function BillingPage() {
  return (
    <div className="min-h-screen bg-background">
      <TopBar title="Billing" subtitle="Kelola pembayaran dan invoice" />

      <div className="p-8">
        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-5 mb-7">
          {SUMMARY.map(s => (
            <div key={s.label} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                  <DollarSign size={20} className="text-primary" />
                </div>
                <span className="text-xs font-bold text-muted-foreground">{s.count} invoice</span>
              </div>
              <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-1">{s.label}</p>
              <p className="text-2xl font-black text-secondary tabular-nums">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Invoice list */}
        <div className="space-y-3">
          {INVOICES.map(inv => (
            <div
              key={inv.id}
              className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow animate-fade-in-up"
            >
              <div className="flex items-center gap-5">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${avatarColor(inv.patient)} flex items-center justify-center text-white font-black text-base flex-shrink-0`}>
                  {inv.avatar}
                </div>

                <div className="flex-1 grid grid-cols-5 gap-4 items-center">
                  <div>
                    <p className="font-black text-secondary text-sm">{inv.patient}</p>
                    <p className="text-xs text-muted-foreground font-semibold mt-0.5">{inv.noRM}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-0.5">Invoice ID</p>
                    <p className="text-sm font-bold text-secondary font-mono">{inv.id}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-0.5">Tanggal</p>
                    <p className="text-sm font-bold text-secondary">{inv.date}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-0.5">Total</p>
                    <p className="text-base font-black text-secondary tabular-nums">{inv.amount}</p>
                  </div>
                  <div className="flex items-center gap-2 justify-end">
                    <span className={`px-3 py-1.5 rounded-full font-bold text-xs ${
                      inv.status === 'Lunas' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                    }`}>
                      {inv.status}
                    </span>
                    {inv.status === 'Pending' && (
                      <button className="p-2 hover:bg-primary/10 rounded-xl transition-colors" title="Kirim WA">
                        <Send size={16} className="text-primary" />
                      </button>
                    )}
                    <button className="p-2 hover:bg-gray-100 rounded-xl transition-colors" title="Download">
                      <Download size={16} className="text-gray-500" />
                    </button>
                  </div>
                </div>
              </div>

              {inv.status === 'Pending' && (
                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground font-semibold">Pengingat terakhir dikirim 2 hari lalu</p>
                  <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary-hover transition-colors font-bold text-sm">
                    <Send size={14} /> Kirim WA
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
