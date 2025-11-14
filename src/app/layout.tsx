import type { Metadata } from 'next'
import './globals.css'
import StructuredData from '@/components/StructuredData'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://auraxpro.com'
const siteName = 'AuraXPro'
const defaultTitle = 'AuraXPro AI - Intelligent Development Assistant'
const defaultDescription = 'Chat with AuraXPro AI to learn about our full-stack web development services, 3D configurators, Shopify/WordPress customization, and AI-powered solutions. Get expert insights on Next.js, React Three Fiber, and modern web technologies.'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: defaultTitle,
    template: `%s | ${siteName}`,
  },
  description: defaultDescription,
  keywords: [
    'AuraXPro',
    'AI Assistant',
    'Web Development',
    'Next.js Development',
    'React Three Fiber',
    '3D Configurators',
    'Shopify Development',
    'WordPress Development',
    'Full Stack Development',
    'Nest.js',
    'Django',
    'Python Development',
    'Web Application Development',
    'AI-Powered Solutions',
    'Custom Software Development',
  ],
  authors: [{ name: 'AuraXPro' }],
  creator: 'AuraXPro',
  publisher: 'AuraXPro',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
    siteName: siteName,
    title: defaultTitle,
    description: defaultDescription,
    images: [
      {
        url: '/brand.png',
        width: 1280,
        height: 640,
        alt: 'AuraXPro AI Assistant',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: defaultTitle,
    description: defaultDescription,
    images: ['/brand.png'],
    creator: '@auraxpro',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    // Add your verification codes here when available
    // google: 'your-google-verification-code',
    // yandex: 'your-yandex-verification-code',
    // bing: 'your-bing-verification-code',
  },
  alternates: {
    canonical: siteUrl,
  },
  category: 'Technology',
  classification: 'Web Development, AI Assistant, Software Development',
}

const structuredData = [
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'AuraXPro',
    url: siteUrl,
    logo: `${siteUrl}/brand.png`,
    description: defaultDescription,
    sameAs: [
      // Add your social media profiles here
      // 'https://twitter.com/auraxpro',
      // 'https://linkedin.com/company/auraxpro',
      // 'https://github.com/auraxpro',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Customer Service',
      availableLanguage: ['English'],
    },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'AuraXPro AI Assistant',
    url: siteUrl,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web Browser',
    description: defaultDescription,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    featureList: [
      'AI-Powered Chat Assistant',
      'Project-Based Context Switching',
      'Multi-Conversation Support',
      'Real-time Streaming Responses',
      'Knowledge Base Integration',
    ],
  },
  {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'AuraXPro AI',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    description: defaultDescription,
    url: siteUrl,
    author: {
      '@type': 'Organization',
      name: 'AuraXPro',
    },
  },
]

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <StructuredData data={structuredData} />
        {children}
      </body>
    </html>
  )
}

