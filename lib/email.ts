import { Resend } from 'resend'
import { ReactElement } from 'react'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendEmail({
  to,
  subject,
  react,
}: {
  to: string
  subject: string
  react: ReactElement
}): Promise<{ success: boolean; error?: string }> {
  try {
    await resend.emails.send({
      from: `JA Clinic <${process.env.EMAIL_FROM}>`,
      to,
      subject,
      react,
    })
    return { success: true }
  } catch (err) {
    console.error('[sendEmail] failed:', err)
    return { success: false, error: String(err) }
  }
}
