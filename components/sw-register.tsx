'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    if (process.env.NODE_ENV === 'production') {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('[NetPulse PWA] Service worker registered with scope:', reg.scope);
        })
        .catch((err) => {
          console.warn('[NetPulse PWA] Service worker registration failed:', err);
        });
      return;
    }

    // Development must never be controlled by a production-style cached worker.
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => registration.unregister());
    });
    caches.keys().then((keys) => {
      keys.filter((key) => key.startsWith('netpulse-pwa-')).forEach((key) => caches.delete(key));
    });
  }, []);

  return null;
}
