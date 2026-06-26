import { requireEntitlement } from '@/lib/clinic-entitlements'
import DispensingClient from './DispensingClient'

export const dynamic = 'force-dynamic'

export default async function DispensingPage() {
  await requireEntitlement('pharmacy')
  return <DispensingClient />
}
