'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      process.env.NODE_ENV === 'production'
    ) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('[NetPulse PWA] Service worker registered with scope:', reg.scope);
        })
        .catch((err) => {
          console.warn('[NetPulse PWA] Service worker registration failed:', err);
        });
    } else if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator
    ) {
      // In dev mode, still register so PWA install prompt & offline checks work
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('[NetPulse PWA] Service worker registered (dev):', reg.scope);
        })
        .catch((err) => {
          console.debug('[NetPulse PWA] SW notice:', err);
        });
    }
  }, []);

  return null;
}
