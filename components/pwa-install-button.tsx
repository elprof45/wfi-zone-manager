'use client';

import React, { useState } from 'react';
import { usePWAInstall } from '@/lib/use-pwa-install';
import { Download, Share, PlusSquare, Check, X, Smartphone } from 'lucide-react';

interface PWAInstallButtonProps {
  variant?: 'compact' | 'full' | 'sidebar';
  className?: string;
}

export function PWAInstallButton({ variant = 'compact', className = '' }: PWAInstallButtonProps) {
  const { isInstallable, isInstalled, isIOS, mounted, install } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [hasCopiedUrl, setHasCopiedUrl] = useState(false);

  // During SSR and before mounting on client, return null to prevent hydration mismatches
  if (!mounted || isInstalled) {
    return null;
  }

  const handleCopyUrl = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setHasCopiedUrl(true);
      setTimeout(() => setHasCopiedUrl(false), 2000);
    }
  };

  // 1. Android / Chromium / Desktop Install Flow
  if (isInstallable) {
    if (variant === 'sidebar') {
      return (
        <button
          onClick={install}
          className={`w-full flex items-center justify-between p-2.5 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-xs font-medium shadow-sm hover:opacity-95 active:scale-[0.98] transition min-h-[44px] ${className}`}
          title="Installer NetPulse sur votre appareil"
        >
          <span className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            <span>Installer l&apos;App PWA</span>
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/20 dark:bg-black/10 font-semibold">
            App
          </span>
        </button>
      );
    }

    if (variant === 'full') {
      return (
        <button
          onClick={install}
          className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-black hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-black text-xs font-semibold shadow-sm transition active:scale-95 min-h-[44px] ${className}`}
        >
          <Download className="h-4 w-4" />
          <span>Installer l&apos;Application Mobile (PWA)</span>
        </button>
      );
    }

    // Default compact (e.g. Navbar)
    return (
      <button
        onClick={install}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-medium shadow-sm hover:opacity-90 active:scale-95 transition min-h-[36px] ${className}`}
        title="Installer l'application sur votre appareil"
      >
        <Download className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Installer PWA</span>
        <span className="sm:hidden">App</span>
      </button>
    );
  }

  // 2. iOS Safari Flow (shows step-by-step modal guide)
  return (
    <>
      {variant === 'sidebar' ? (
        <button
          onClick={() => setShowIOSModal(true)}
          className={`w-full flex items-center justify-between p-2.5 rounded-xl border border-neutral-200/80 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-900 text-neutral-800 dark:text-neutral-200 text-xs font-medium transition min-h-[44px] ${className}`}
          title="Installer sur iPhone ou iPad"
        >
          <span className="flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-neutral-500" />
            <span>Installer sur iOS</span>
          </span>
          <span className="text-[10px] text-neutral-400">Safari</span>
        </button>
      ) : variant === 'full' ? (
        <button
          onClick={() => setShowIOSModal(true)}
          className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-900 dark:text-white text-xs font-semibold transition active:scale-95 min-h-[44px] ${className}`}
        >
          <Smartphone className="h-4 w-4" />
          <span>Installer sur iPhone / Android</span>
        </button>
      ) : (
        <button
          onClick={() => setShowIOSModal(true)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-neutral-200/80 dark:border-neutral-800 bg-neutral-100/90 dark:bg-neutral-900/90 hover:bg-neutral-200/80 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs font-medium transition min-h-[36px] ${className}`}
          title="Installer sur smartphone"
        >
          <Download className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Installer l&apos;App</span>
          <span className="sm:hidden">PWA</span>
        </button>
      )}

      {/* iOS & Mobile Safari Guide Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-black dark:bg-white text-white dark:text-black">
                  <Smartphone className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                    Installer NetPulse
                  </h3>
                  <p className="text-[11px] text-neutral-500">
                    Application mobile autonome
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowIOSModal(false)}
                className="text-neutral-400 hover:text-neutral-900 dark:hover:text-white p-1 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-neutral-700 dark:text-neutral-300">
              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-neutral-800">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-200 dark:bg-neutral-700 font-bold text-[11px]">
                  1
                </div>
                <p className="leading-snug">
                  Dans le navigateur <strong>Safari</strong> ou <strong>Chrome</strong>, touchez le bouton de partage{' '}
                  <Share className="inline h-3.5 w-3.5 mx-0.5 text-blue-500" />.
                </p>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-neutral-800">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-200 dark:bg-neutral-700 font-bold text-[11px]">
                  2
                </div>
                <p className="leading-snug">
                  Faites défiler vers le bas et sélectionnez{' '}
                  <strong>« Sur l&apos;écran d&apos;accueil »</strong>{' '}
                  <PlusSquare className="inline h-3.5 w-3.5 mx-0.5 text-neutral-700 dark:text-neutral-300" />.
                </p>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-neutral-800">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-200 dark:bg-neutral-700 font-bold text-[11px]">
                  3
                </div>
                <p className="leading-snug">
                  Appuyez sur <strong>Ajouter</strong> en haut à droite. L&apos;icône NetPulse apparaîtra sur votre écran d&apos;accueil comme une application native.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={handleCopyUrl}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs font-medium transition min-h-[44px]"
              >
                {hasCopiedUrl ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Share className="h-3.5 w-3.5" />}
                <span>{hasCopiedUrl ? 'Lien Copié !' : 'Copier le lien'}</span>
              </button>
              <button
                onClick={() => setShowIOSModal(false)}
                className="py-2 px-4 rounded-xl bg-black dark:bg-white text-white dark:text-black text-xs font-semibold transition hover:opacity-90 min-h-[44px]"
              >
                Compris
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
