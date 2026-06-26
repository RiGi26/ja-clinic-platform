import { requireEntitlement } from '@/lib/clinic-entitlements'
import ShiftsClient from './ShiftsClient'

export const dynamic = 'force-dynamic'

export default async function ShiftsPage() {
  await requireEntitlement('shifts')
  return <ShiftsClient />
}
