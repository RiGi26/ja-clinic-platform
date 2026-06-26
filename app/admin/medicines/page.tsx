import { requireEntitlement } from '@/lib/clinic-entitlements'
import MedicinesClient from './MedicinesClient'

export const dynamic = 'force-dynamic'

export default async function MedicinesPage() {
  await requireEntitlement('pharmacy')
  return <MedicinesClient />
}
