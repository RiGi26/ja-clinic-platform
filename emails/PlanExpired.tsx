import { Section, Text, Button } from '@react-email/components'
import BaseLayout from './components/BaseLayout'

type Props = {
  adminName: string
  clinicName: string
  expiredAt: string
  contactUrl: string
}

export default function PlanExpired({ adminName, clinicName, expiredAt, contactUrl }: Props) {
  return (
    <BaseLayout previewText={`Akses ${clinicName} telah berakhir — hubungi kami sekarang`}>
      <Section>
        <Text style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827', margin: '0 0 16px' }}>
          Akses {clinicName} telah berakhir
        </Text>
        <Text style={{ fontSize: '14px', color: '#374151', margin: '0 0 16px' }}>
          Halo {adminName},
          <br />
          Masa aktif <strong>{clinicName}</strong> telah berakhir sejak <strong>{expiredAt}</strong>.
          <br />
          Platform tidak dapat diakses sementara.
        </Text>
        <Section style={{
          backgroundColor: '#FEE2E2',
          borderLeft: '4px solid #EF4444',
          padding: '16px',
          borderRadius: '4px',
          margin: '0 0 24px',
        }}>
          <Text style={{ fontSize: '13px', color: '#374151', margin: 0 }}>
            Seluruh akses admin dan staf dinonaktifkan sementara
            hingga subscription Anda diperbarui.
          </Text>
        </Section>
        <Button
          href={contactUrl}
          style={{
            backgroundColor: '#25D366',
            color: '#ffffff',
            borderRadius: '6px',
            padding: '12px 24px',
            fontSize: '14px',
            fontWeight: 'bold',
            textDecoration: 'none',
            display: 'inline-block',
          }}
        >
          Hubungi Kami via WhatsApp
        </Button>
        <Text style={{ fontSize: '13px', color: '#9CA3AF', marginTop: '24px' }}>
          Butuh bantuan? Email kami di support@webzoka.com
        </Text>
      </Section>
    </BaseLayout>
  )
}
