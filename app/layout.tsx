import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { tenantConfig } from '@/lib/tenant-config'

const inter = Inter({ subsets: ['latin'], display: 'swap' })

export const metadata: Metadata = {
  title: tenantConfig.name,
  description: tenantConfig.tagline,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${inter.className} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  )
}
