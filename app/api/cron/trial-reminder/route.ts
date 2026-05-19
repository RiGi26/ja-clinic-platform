import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'
import React from 'react'
import TrialExpiryReminder from '@/emails/TrialExpiryReminder'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const authHeader = request.headers.get('Authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = createAdminClient()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const { data: clinics, error } = await db
    .from('clinics')
    .select('id, name, plan_expires_at')
    .eq('plan', 'trial')
    .not('plan_expires_at', 'is', null)
    .eq('is_active', true)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const clinicsToCheck = clinics ?? []
  const checked = clinicsToCheck.length
  let reminded = 0
  const errors: string[] = []

  const results = await Promise.allSettled(
    clinicsToCheck.map(async (clinic) => {
      const expiry = new Date(clinic.plan_expires_at!)
      expiry.setHours(0, 0, 0, 0)
      const daysLeft = Math.round((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

      if (![7, 3, 1].includes(daysLeft)) return

      const { data: admin } = await db
        .from('users')
        .select('email, full_name')
        .eq('clinic_id', clinic.id)
        .eq('role', 'admin')
        .limit(1)
        .single()

      if (!admin?.email) return

      const expiresAt = new Intl.DateTimeFormat('id-ID', {
        day: 'numeric', month: 'long', year: 'numeric',
      }).format(expiry)

      const result = await sendEmail({
        to: admin.email,
        subject: `Trial ${clinic.name} berakhir dalam ${daysLeft} hari`,
        react: React.createElement(TrialExpiryReminder, {
          adminName: admin.full_name,
          clinicName: clinic.name,
          daysLeft,
          expiresAt,
          upgradeUrl: `${process.env.NEXT_PUBLIC_APP_URL}/admin/settings`,
        }),
      })

      if (result.success) {
        console.log(`[cron/trial-reminder] sent to ${admin.email} (${clinic.name}, ${daysLeft}d left)`)
        return true
      }
      throw new Error(`failed for ${clinic.name}: ${result.error}`)
    })
  )

  results.forEach((r) => {
    if (r.status === 'fulfilled' && r.value === true) reminded++
    if (r.status === 'rejected') errors.push(String(r.reason))
  })

  return NextResponse.json({ checked, reminded, errors })
}
