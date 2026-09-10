'use client';

import React from 'react';
import { useOnlineStatus } from '@/lib/use-online-status';
import { useIsMounted } from '@/lib/use-mounted';
import { WifiOff, RefreshCw } from 'lucide-react';

export function OfflineIndicator() {
  const isMounted = useIsMounted();
  const isOnline = useOnlineStatus();

  // During SSR and initial client hydration, always return null to prevent hydration mismatches
  if (!isMounted || isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 z-50 flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-neutral-900/95 dark:bg-white/95 text-white dark:text-neutral-900 shadow-2xl backdrop-blur-md border border-neutral-700 dark:border-neutral-300 animate-in fade-in slide-in-from-bottom-4 duration-300"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 dark:text-amber-600">
          <WifiOff className="h-4 w-4 stroke-[2.2]" />
        </div>
        <div>
          <div className="text-xs font-semibold leading-tight">
            Mode Hors-Ligne Actif
          </div>
          <p className="text-[11px] opacity-80 leading-tight">
            Données locales en cache. Les opérations seront synchronisées dès le retour du réseau.
          </p>
        </div>
      </div>

      <button
        onClick={() => window.location.reload()}
        className="shrink-0 flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-white/10 dark:bg-black/10 hover:bg-white/20 dark:hover:bg-black/20 transition min-h-[36px]"
      >
        <RefreshCw className="h-3 w-3" />
        <span>Réessayer</span>
      </button>
    </div>
  );
}
