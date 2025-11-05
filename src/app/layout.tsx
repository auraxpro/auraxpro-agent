import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AuraXPro AI',
  description: 'AI assistant for AuraXPro services and development',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

