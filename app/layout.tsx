import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Inter } from 'next/font/google';
import { cn } from '@/lib/utils';
import { ThemeProvider } from '@/components/theme-provider';
import { ServiceWorkerRegister } from '@/components/sw-register';
import { OfflineIndicator } from '@/components/offline-indicator';
import { Toaster } from '@/components/toaster';

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

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning className={cn(inter.variable, inter.className)}>
      <body
        suppressHydrationWarning
        className={cn(inter.className, 'bg-background text-foreground antialiased min-h-screen')}
      >
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <ServiceWorkerRegister />
          <OfflineIndicator />
          <Toaster richColors position="top-right" />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}

