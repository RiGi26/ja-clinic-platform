import { Section, Text, Button } from '@react-email/components'
import BaseLayout from './components/BaseLayout'

type Props = {
  patientName: string
  clinicName: string
  noRM: string
  loginUrl: string
}

export default function WelcomePatient({ patientName, clinicName, noRM, loginUrl }: Props) {
  return (
    <BaseLayout previewText={`Akun Anda di ${clinicName} telah aktif — No. RM: ${noRM}`}>
      <Section>
        <Text style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827', margin: '0 0 16px' }}>
          Selamat datang, {patientName}! 👋
        </Text>
        <Text style={{ fontSize: '14px', color: '#374151', lineHeight: '1.6', margin: '0 0 12px' }}>
          Akun Anda di <strong>{clinicName}</strong> telah berhasil dibuat.
        </Text>
        <Text style={{ fontSize: '14px', color: '#374151', lineHeight: '1.6', margin: '0 0 12px' }}>
          No. Rekam Medis Anda: <strong>{noRM}</strong>
          <br />
          Simpan nomor ini untuk keperluan kunjungan berikutnya.
        </Text>
        <Text style={{ fontSize: '14px', color: '#374151', lineHeight: '1.6', margin: '0 0 24px' }}>
          Silakan login untuk melihat jadwal dan rekam medis Anda.
        </Text>
        <Button
          href={loginUrl}
          style={{
            backgroundColor: '#0891B2',
            color: '#ffffff',
            borderRadius: '6px',
            padding: '12px 24px',
            fontSize: '14px',
            fontWeight: 'bold',
            textDecoration: 'none',
            display: 'inline-block',
          }}
        >
          Login Sekarang
        </Button>
        <Text style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '32px' }}>
          Jika Anda tidak merasa mendaftar, abaikan email ini.
        </Text>
      </Section>
    </BaseLayout>
  )
}
