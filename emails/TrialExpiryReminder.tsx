import { Section, Text, Button } from '@react-email/components'
import BaseLayout from './components/BaseLayout'

type Props = {
  adminName: string
  clinicName: string
  daysLeft: number
  expiresAt: string
  upgradeUrl: string
}

export default function TrialExpiryReminder({
  adminName, clinicName, daysLeft, expiresAt,
}: Props) {
  return (
    <BaseLayout previewText={`Trial ${clinicName} berakhir dalam ${daysLeft} hari`}>
      <Section>
        <Text style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827', margin: '0 0 16px' }}>
          Trial Anda berakhir dalam {daysLeft} hari
        </Text>
        <Text style={{ fontSize: '14px', color: '#374151', margin: '0 0 12px' }}>
          Halo {adminName},
          <br />
          Masa trial <strong>{clinicName}</strong> akan berakhir pada <strong>{expiresAt}</strong>.
          <br />
          Hubungi tim kami untuk melanjutkan layanan.
        </Text>
        {daysLeft === 1 && (
          <Text style={{ fontSize: '14px', color: '#EF4444', fontWeight: 'bold', margin: '0 0 16px' }}>
            ⚠️ Besok adalah hari terakhir trial Anda.
          </Text>
        )}
        <Section style={{
          backgroundColor: '#FFF3CD',
          borderLeft: '4px solid #F59E0B',
          padding: '16px',
          borderRadius: '4px',
          margin: '0 0 24px',
        }}>
          <Text style={{ fontSize: '13px', color: '#374151', margin: 0 }}>
            Setelah trial berakhir, admin tidak dapat mengakses platform
            hingga subscription diaktifkan.
          </Text>
        </Section>
        <Button
          href="https://wa.me/6281296917963"
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
          Hubungi Tim Kami
        </Button>
      </Section>
    </BaseLayout>
  )
}
