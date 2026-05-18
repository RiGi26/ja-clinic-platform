import { headers } from 'next/headers'

export async function getClinicIdFromDomain(): Promise<string | null> {
  const headersList = await headers()
  return headersList.get('x-clinic-id')
}

export async function isCustomDomain(): Promise<boolean> {
  const headersList = await headers()
  return headersList.has('x-custom-domain')
}
