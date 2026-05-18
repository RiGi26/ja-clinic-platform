function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.startsWith('0')) return '62' + digits.slice(1)
  if (digits.startsWith('62')) return digits
  return '62' + digits
}

export async function sendWhatsApp(
  token: string,
  phone: string,
  message: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        Authorization: token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        target: formatPhone(phone),
        message,
        countryCode: '62',
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      return { success: false, error: `HTTP ${res.status}: ${text}` }
    }

    const json = (await res.json()) as { status: boolean; reason?: string }
    if (!json.status) {
      return { success: false, error: json.reason ?? 'Fonnte returned status false' }
    }

    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Network error' }
  }
}
