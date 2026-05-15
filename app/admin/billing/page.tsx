import { redirect } from 'next/navigation'
import { getClinicUser } from '@/lib/clinic'
import { createAdminClient } from '@/lib/supabase/server'
import TopBar from '@/components/TopBar'
import { DollarSign, Send, Download } from 'lucide-react'

export const dynamic = 'force-dynamic'

function fmtRupiah(n: number) {
  if (n >= 1_000_000) return `Rp ${(n/1_000_000).toFixed(1).replace('.0','')}jt`
  if (n >= 1_000)     return `Rp ${(n/1_000).toFixed(0)}rb`
  return `Rp ${n.toLocaleString('id-ID')}`
}

const AVATAR_COLORS = ['from-cyan-400 to-blue-500','from-violet-400 to-purple-600','from-emerald-400 to-teal-600','from-orange-400 to-red-500']
function avatarColor(name: string) {
  const sum = name.split('').reduce((a,c) => a+c.charCodeAt(0),0)
  return AVATAR_COLORS[sum % AVATAR_COLORS.length]
}

export default async function BillingPage() {
  const user = await getClinicUser()
  if (user.role !== 'admin') redirect('/auth/login')

  const db = createAdminClient()
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const { data: billings } = await db
    .from('billing')
    .select('id, invoice_number, total, status, created_at, patients(full_name, no_rm)')
    .eq('clinic_id', user.clinic_id)
    .order('created_at', { ascending: false })
    .limit(50)

  const bills = (billings ?? []) as any[]
  const pending = bills.filter(b => b.status === 'pending')
  const paid    = bills.filter(b => b.status === 'paid' && b.created_at >= monthStart)
  const totalPending = pending.reduce((s, b) => s + (b.total ?? 0), 0)
  const totalPaid    = paid.reduce((s, b) => s + (b.total ?? 0), 0)

  const SUMMARY = [
    { label: 'Belum Bayar',       value: fmtRupiah(totalPending), count: pending.length },
    { label: 'Lunas Bulan Ini',   value: fmtRupiah(totalPaid),    count: paid.length    },
    { label: 'Total Invoice',     value: fmtRupiah(totalPending + totalPaid), count: bills.length },
  ]

  return (
    <div className="min-h-screen bg-background">
      <TopBar title="Billing" subtitle="Kelola pembayaran dan invoice" />
      <div className="p-8">
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

        {bills.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center shadow-sm">
            <p className="text-muted-foreground font-semibold text-sm">Belum ada data billing</p>
          </div>
        ) : (
          <div className="space-y-3">
            {bills.map((b: any) => {
              const patientName = b.patients?.full_name ?? 'Pasien'
              const noRM        = b.patients?.no_rm ?? '—'
              const date        = new Date(b.created_at).toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric' })
              return (
                <div key={b.id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow animate-fade-in-up">
                  <div className="flex items-center gap-5">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${avatarColor(patientName)} flex items-center justify-center text-white font-black text-base flex-shrink-0`}>
                      {patientName.split(' ').map((w:string) => w[0]).slice(0,2).join('').toUpperCase()}
                    </div>
                    <div className="flex-1 grid grid-cols-5 gap-4 items-center">
                      <div>
                        <p className="font-black text-secondary text-sm">{patientName}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{noRM}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-0.5">Invoice</p>
                        <p className="text-sm font-bold text-secondary font-mono">{b.invoice_number}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-0.5">Tanggal</p>
                        <p className="text-sm font-bold text-secondary">{date}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-0.5">Total</p>
                        <p className="text-base font-black text-secondary tabular-nums">{fmtRupiah(b.total ?? 0)}</p>
                      </div>
                      <div className="flex items-center gap-2 justify-end">
                        <span className={`px-3 py-1.5 rounded-full font-bold text-xs ${b.status === 'paid' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                          {b.status === 'paid' ? 'Lunas' : 'Pending'}
                        </span>
                        {b.status === 'pending' && (
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
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
