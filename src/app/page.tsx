import Chat from '@/components/Chat';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AuraXPro AI - Intelligent Development Assistant',
  description: 'Chat with AuraXPro AI to learn about our full-stack web development services, 3D configurators, Shopify/WordPress customization, and AI-powered solutions. Get expert insights on Next.js, React Three Fiber, and modern web technologies.',
  openGraph: {
    title: 'AuraXPro AI - Intelligent Development Assistant',
    description: 'Chat with AuraXPro AI to learn about our full-stack web development services, 3D configurators, Shopify/WordPress customization, and AI-powered solutions.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AuraXPro AI - Intelligent Development Assistant',
    description: 'Chat with AuraXPro AI to learn about our full-stack web development services, 3D configurators, Shopify/WordPress customization, and AI-powered solutions.',
  },
  alternates: {
    canonical: '/',
  },
};

export default function Home() {
  return (
    <main role="main" aria-label="AuraXPro AI Chat Interface">
      <Chat />
    </main>
  );
}
