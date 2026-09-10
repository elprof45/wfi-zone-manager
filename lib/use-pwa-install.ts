'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { useIsMounted } from './use-mounted';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

function subscribeStandalone(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  const mql = window.matchMedia('(display-mode: standalone)');
  mql.addEventListener('change', callback);
  window.addEventListener('appinstalled', callback);
  return () => {
    mql.removeEventListener('change', callback);
    window.removeEventListener('appinstalled', callback);
  };
}

function getStandaloneSnapshot() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function getServerStandaloneSnapshot() {
  return false;
}

function getIOSSnapshot() {
  if (typeof window === 'undefined') return false;
  return /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
}

function getServerIOSSnapshot() {
  return false;
}

export function usePWAInstall() {
  const mounted = useIsMounted();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const isStandalone = useSyncExternalStore(subscribeStandalone, getStandaloneSnapshot, getServerStandaloneSnapshot);
  const isIOS = useSyncExternalStore(() => () => {}, getIOSSnapshot, getServerIOSSnapshot);
  const [installedManually, setInstalledManually] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setInstalledManually(true);
        setDeferredPrompt(null);
        return true;
      }
    } catch (err) {
      console.error('Error during PWA installation prompt:', err);
    }
    return false;
  };

  return {
    isInstallable: !!deferredPrompt,
    isInstalled: isStandalone || installedManually,
    isIOS,
    mounted,
    install,
  };
}
