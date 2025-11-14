import { MetadataRoute } from 'next'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://auraxpro.com'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'AuraXPro AI - Intelligent Development Assistant',
    short_name: 'AuraXPro AI',
    description: 'Chat with AuraXPro AI to learn about our full-stack web development services, 3D configurators, Shopify/WordPress customization, and AI-powered solutions.',
    start_url: '/',
    display: 'standalone',
    background_color: '#171717',
    theme_color: '#171717',
    icons: [
      {
        src: '/brand.png',
        sizes: '128x51',
        type: 'image/png',
      },
      {
        src: '/Logo.png',
        sizes: 'any',
        type: 'image/png',
      },
    ],
  }
}



