import { requireEntitlement } from '@/lib/clinic-entitlements'
import ReceptionistBillingClient from './ReceptionistBillingClient'

export const dynamic = 'force-dynamic'

export default async function ReceptionistBillingPage() {
  await requireEntitlement('billing')
  return <ReceptionistBillingClient />
}
