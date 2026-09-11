'use client';

import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { ServiceWorkerRegister } from '@/components/sw-register';
import { OfflineIndicator } from '@/components/offline-indicator';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      <ServiceWorkerRegister />
      <OfflineIndicator />
      <Toaster richColors position="top-right" />
      {children}
    </ThemeProvider>
  );
}
