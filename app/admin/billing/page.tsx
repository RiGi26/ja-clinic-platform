import { redirect } from 'next/navigation'
import { getClinicUser } from '@/lib/clinic'
import { createAdminClient } from '@/lib/supabase/server'
import TopBar from '@/components/TopBar'
import BillingClient from './BillingClient'

export const dynamic = 'force-dynamic'

export default async function BillingPage() {
  const user = await getClinicUser()
  if (user.role !== 'admin') redirect('/auth/login')

  const db  = createAdminClient()
  const cid = user.clinic_id
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const { data: billings } = await db
    .from('billing')
    .select('id, invoice_number, total, status, payment_method, created_at, patients(full_name, no_rm)')
    .eq('clinic_id', cid)
    .order('created_at', { ascending: false })
    .limit(100)

  const bills      = (billings ?? []) as any[]
  const pending    = bills.filter(b => b.status === 'pending')
  const paid       = bills.filter(b => b.status === 'paid' && b.created_at >= monthStart)
  const totalPend  = pending.reduce((s: number, b: any) => s + (b.total ?? 0), 0)
  const totalPaid  = paid.reduce((s: number, b: any)    => s + (b.total ?? 0), 0)

  const summary = {
    totalPending: totalPend,
    totalPaid,
    countPending: pending.length,
    countPaid   : paid.length,
    total       : bills.length,
  }

  return (
    <div className="min-h-screen bg-background">
      <TopBar title="Billing" subtitle="Kelola pembayaran dan invoice" />
      <div className="p-8">
        <BillingClient initial={bills} summary={summary} />
      </div>
    </div>
  )
}
