import { Section, Text, Button } from '@react-email/components'
import BaseLayout from './components/BaseLayout'

type Props = {
  patientName: string
  clinicName: string
  doctorName: string
  scheduledAt: string
  queueNumber: number
  clinicAddress: string | null
  loginUrl: string
}

export default function AppointmentConfirmed({
  patientName, clinicName, doctorName, scheduledAt, queueNumber, clinicAddress, loginUrl,
}: Props) {
  return (
    <BaseLayout previewText={`Appointment dikonfirmasi — ${scheduledAt} dengan ${doctorName}`}>
      <Section>
        <Text style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827', margin: '0 0 16px' }}>
          Appointment Anda Dikonfirmasi ✅
        </Text>
        <Text style={{ fontSize: '14px', color: '#374151', margin: '0 0 16px' }}>
          Halo {patientName},
          <br />
          Appointment Anda telah terdaftar dengan detail berikut:
        </Text>
        <Section style={{
          backgroundColor: '#EFF6FF',
          borderLeft: '4px solid #0891B2',
          padding: '16px',
          borderRadius: '4px',
          margin: '0 0 24px',
        }}>
          <Text style={{ fontSize: '13px', color: '#374151', margin: '0 0 6px' }}>🏥 Klinik: <strong>{clinicName}</strong></Text>
          <Text style={{ fontSize: '13px', color: '#374151', margin: '0 0 6px' }}>👨‍⚕️ Dokter: <strong>{doctorName}</strong></Text>
          <Text style={{ fontSize: '13px', color: '#374151', margin: '0 0 6px' }}>📅 Jadwal: <strong>{scheduledAt}</strong></Text>
          <Text style={{ fontSize: '13px', color: '#374151', margin: '0 0 6px' }}>🔢 No. Antrian: <strong>{queueNumber}</strong></Text>
          <Text style={{ fontSize: '13px', color: '#374151', margin: 0 }}>📍 Alamat: {clinicAddress ?? '-'}</Text>
        </Section>
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
          Lihat Detail
        </Button>
        <Text style={{ fontSize: '13px', color: '#374151', marginTop: '24px' }}>
          Harap hadir 10 menit sebelum jadwal.
          <br />
          Jika perlu reschedule, hubungi klinik kami.
        </Text>
      </Section>
    </BaseLayout>
  )
}
