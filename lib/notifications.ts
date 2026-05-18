import type { SupabaseClient } from '@supabase/supabase-js'
import { sendWhatsApp } from './fonnte'

export type NotificationType =
  | 'appointment_reminder'
  | 'appointment_confirmed'
  | 'appointment_cancelled'
  | 'billing_invoice'
  | 'general'

interface SendAndLogPayload {
  type: NotificationType
  recipient: string
  message: string
  phone: string
  token: string
}

export async function sendAndLog(
  db: SupabaseClient,
  clinicId: string,
  payload: SendAndLogPayload,
): Promise<{ success: boolean; notificationId?: string; error?: string }> {
  const { data: notif, error: insertErr } = await db
    .from('notifications')
    .insert({
      clinic_id: clinicId,
      type: payload.type,
      recipient: payload.recipient,
      message: payload.message,
      status: 'pending',
    })
    .select('id')
    .single()

  if (insertErr || !notif) {
    return { success: false, error: insertErr?.message ?? 'Failed to create notification record' }
  }

  const result = await sendWhatsApp(payload.token, payload.phone, payload.message)

  await db
    .from('notifications')
    .update({
      status: result.success ? 'sent' : 'failed',
      sent_at: result.success ? new Date().toISOString() : null,
    })
    .eq('id', notif.id)

  return {
    success: result.success,
    notificationId: notif.id,
    error: result.error,
  }
}

export function buildMessage(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '')
}
