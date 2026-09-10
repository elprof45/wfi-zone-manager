import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { ServiceWorkerRegister } from '@/components/sw-register';
import { OfflineIndicator } from '@/components/offline-indicator';

export const viewport: Viewport = {
  themeColor: '#0f172a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'NetPulse Hotspot Manager',
  description:
    'Solution SaaS de gestion de hotspots MikroTik, découplage de l\'intelligence commerciale, impression de tickets en masse, clôture de caisse et monitoring temps réel.',
  applicationName: 'NetPulse',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'NetPulse',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.png', sizes: '48x48', type: 'image/png' },
      { url: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  openGraph: {
    title: 'NetPulse Hotspot Manager',
    description:
      'Solution SaaS de gestion de hotspots MikroTik, découplage de l\'intelligence commerciale, impression de tickets en masse, clôture de caisse et monitoring temps réel.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NetPulse Hotspot Manager',
    description:
      'Solution SaaS de gestion de hotspots MikroTik, découplage de l\'intelligence commerciale, impression de tickets en masse, clôture de caisse et monitoring temps réel.',
  },
};

import { Toaster } from '@/components/toaster';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className="bg-[#f5f5f7] text-neutral-900 dark:bg-[#000000] dark:text-neutral-100 antialiased min-h-screen selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black"
      >
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <ServiceWorkerRegister />
          <OfflineIndicator />
          <Toaster richColors position="top-right" />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}

