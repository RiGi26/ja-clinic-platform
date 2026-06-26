import { requireEntitlement } from '@/lib/clinic-entitlements'
import LaporanClient from './LaporanClient'

export const dynamic = 'force-dynamic'

export default async function LaporanPage() {
  await requireEntitlement('reports')
  return <LaporanClient />
}
