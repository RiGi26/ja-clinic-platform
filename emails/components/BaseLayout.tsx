import {
  Html, Head, Body, Container, Section, Text, Hr, Preview,
} from '@react-email/components'
import { ReactNode } from 'react'

export default function BaseLayout({
  children,
  previewText,
}: {
  children: ReactNode
  previewText?: string
}) {
  return (
    <Html>
      <Head />
      {previewText && <Preview>{previewText}</Preview>}
      <Body style={{ backgroundColor: '#F0F9FF', margin: 0, padding: '40px 0', fontFamily: 'Arial, sans-serif' }}>
        <Container style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          padding: '40px',
          maxWidth: '560px',
          margin: '0 auto',
        }}>
          <Section style={{ marginBottom: '24px' }}>
            <Text style={{ fontSize: '24px', fontWeight: 'bold', color: '#0891B2', margin: '0 0 4px' }}>
              Clinic Platform
            </Text>
            <Text style={{ fontSize: '12px', color: '#9CA3AF', margin: 0 }}>
              by Japan Arena Corp
            </Text>
          </Section>

          {children}

          <Hr style={{ borderColor: '#E5E7EB', margin: '32px 0 24px' }} />

          <Text style={{ fontSize: '12px', color: '#9CA3AF', textAlign: 'center', margin: 0 }}>
            © {new Date().getFullYear()} Japan Arena Corp. All rights reserved.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
