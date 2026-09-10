'use client';

import React from 'react';
import { useTheme } from 'next-themes';
import {
  Wifi,
  Sun,
  Moon,
  Plus,
  ShieldCheck,
  UserCheck,
  RefreshCw,
  SlidersHorizontal,
  Server,
  Bell,
  Sparkles,
  ExternalLink,
  Menu,
  Search,
} from 'lucide-react';
import { MikroTikRouter, UserRole } from '@/lib/types';
import { PWAInstallButton } from './pwa-install-button';
import { useIsMounted } from '@/lib/use-mounted';
import Link from 'next/link';

interface NavbarProps {
  routers: MikroTikRouter[];
  selectedRouterId: string;
  onSelectRouter: (id: string) => void;
  activeUsersCount: number;
  currentRole: UserRole;
  userName?: string;
  onToggleRole: () => void;
  onOpenQuickGenerate: () => void;
  onRefreshData: () => void;
  isRefreshing?: boolean;
  onOpenAssistant?: () => void;
  onOpenMobileDrawer?: () => void;
  onOpenCommandPalette?: () => void;
}

export function Navbar({
  routers,
  selectedRouterId,
  onSelectRouter,
  activeUsersCount,
  currentRole,
  userName,
  onToggleRole,
  onOpenQuickGenerate,
  onRefreshData,
  isRefreshing = false,
  onOpenAssistant,
  onOpenMobileDrawer,
  onOpenCommandPalette,
}: NavbarProps) {
  const { theme, setTheme } = useTheme();
  const mounted = useIsMounted();

  const selectedRouter = routers.find((r) => r.id === selectedRouterId);

  return (
    <header
      id="main-navbar"
      className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-black/[0.06] dark:border-white/[0.08] bg-white/80 dark:bg-black/80 backdrop-blur-xl px-3 sm:px-6 transition-colors"
    >
      {/* Left: Brand, Drawer toggle & Site selector */}
      <div className="flex items-center gap-2 sm:gap-6">
        {/* Mobile Hamburger Drawer Trigger */}
        {onOpenMobileDrawer && (
          <button
            id="btn-open-mobile-drawer"
            onClick={onOpenMobileDrawer}
            aria-label="Ouvrir le menu de navigation"
            className="md:hidden p-2 text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition min-h-[40px] min-w-[40px] flex items-center justify-center -ml-1"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}

        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-black dark:bg-white text-white dark:text-black shadow-sm transition-transform active:scale-95">
            <Wifi className="h-4 w-4 stroke-[2.2]" />
          </div>
          <div className="hidden sm:block">
            <div className="flex items-center gap-1.5 font-semibold tracking-tight text-black dark:text-white text-sm">
              <span>NetPulse</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 font-medium border border-neutral-200 dark:border-neutral-800">
                2026
              </span>
            </div>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-tight">
              Hotspot & Core Network Intelligence
            </p>
          </div>
        </div>

        {/* Global Site Selector */}
        <div className="flex items-center gap-2 pl-1 sm:pl-2 sm:border-l sm:border-neutral-200 sm:dark:border-neutral-800">
          <Server className="h-3.5 w-3.5 text-neutral-400 hidden md:block" />
          <div className="relative">
            <select
              id="site-selector-dropdown"
              value={selectedRouterId}
              onChange={(e) => onSelectRouter(e.target.value)}
              className="appearance-none max-w-[130px] sm:max-w-[200px] md:max-w-none truncate bg-neutral-100/80 dark:bg-neutral-900/80 border border-neutral-200/80 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs rounded-full pl-2.5 sm:pl-3 pr-7 sm:pr-8 py-1.5 font-medium hover:bg-neutral-200/60 dark:hover:bg-neutral-800/80 transition cursor-pointer focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
            >
              <option value="all">🌐 Tous les sites ({routers.length})</option>
              {routers.map((router) => (
                <option key={router.id} value={router.id}>
                  {router.name} ({router.host})
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-2 sm:right-2.5 top-1/2 -translate-y-1/2 text-neutral-400">
              <SlidersHorizontal className="h-3 w-3" />
            </div>
          </div>
        </div>

        {/* Live status badge */}
        <div className="hidden lg:flex items-center gap-2 text-xs bg-neutral-100/90 dark:bg-neutral-900/90 border border-neutral-200/80 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200 px-3 py-1 rounded-full">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-medium text-[11px]">{activeUsersCount} connectés</span>
        </div>
      </div>

      {/* Right: Actions, Theme, Role switch & Profile */}
      <div className="flex items-center gap-1.5 sm:gap-2.5">
        {/* Command Palette Trigger */}
        {onOpenCommandPalette && (
          <button
            id="btn-navbar-command-palette"
            onClick={onOpenCommandPalette}
            title="Palette de Commandes (Cmd+K / Ctrl+K)"
            className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-full bg-neutral-100 dark:bg-neutral-900 hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white border border-neutral-200/80 dark:border-neutral-800 text-xs transition cursor-pointer"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="hidden md:inline text-[11px]">Rechercher</span>
            <kbd className="text-[10px] font-mono px-1 py-0.5 rounded bg-neutral-200/60 dark:bg-neutral-800 border border-neutral-300/60 dark:border-neutral-700">
              ⌘K
            </kbd>
          </button>
        )}

        {/* PWA Install Button in Navbar */}
        <div className="hidden sm:block">
          <PWAInstallButton variant="compact" />
        </div>

        {/* Refresh button */}
        <button
          id="btn-refresh-network"
          onClick={onRefreshData}
          title="Rafraîchir les métriques"
          className="p-2 text-neutral-600 hover:text-black dark:text-neutral-400 dark:hover:text-white rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-900 transition min-h-[36px] min-w-[36px] flex items-center justify-center"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-black dark:text-white' : ''}`} />
        </button>

        {/* Assistant IA Gemini CTA */}
        {onOpenAssistant && (
          <button
            id="btn-navbar-assistant"
            onClick={onOpenAssistant}
            title="Ouvrir l'Assistant IA Gemini"
            className="hidden sm:flex items-center gap-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 active:scale-95 text-neutral-900 dark:text-white border border-neutral-200/80 dark:border-neutral-800 text-xs font-medium px-3 py-1.5 rounded-full transition min-h-[36px]"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span className="hidden lg:inline">Assistant IA</span>
          </button>
        )}

        {/* Quick Generate Ticket CTA */}
        <button
          id="btn-quick-generate"
          onClick={onOpenQuickGenerate}
          className="flex items-center gap-1.5 bg-black hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 active:scale-95 text-white dark:text-black text-xs font-medium px-3 sm:px-3.5 py-1.5 rounded-full shadow-sm transition min-h-[36px]"
        >
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Générer Fiches</span>
          <span className="sm:hidden text-[11px]">+ Fiches</span>
        </button>

        {/* Theme Toggle */}
        <button
          id="btn-theme-toggle"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          title="Basculer le thème"
          aria-label="Basculer le thème clair ou sombre"
          className="p-2 text-neutral-600 hover:text-black dark:text-neutral-400 dark:hover:text-white rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-900 transition min-h-[36px] min-w-[36px] flex items-center justify-center"
        >
          {mounted ? (
            theme === 'dark' ? (
              <Sun className="h-4 w-4 text-neutral-200" />
            ) : (
              <Moon className="h-4 w-4 text-neutral-700" />
            )
          ) : (
            <div className="h-4 w-4" />
          )}
        </button>

        {/* Role & User Profile */}
        <div className="flex items-center gap-2">
          <div
            id="user-role-badge"
            className="hidden md:flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full border border-neutral-200 dark:border-neutral-800 bg-neutral-100/90 dark:bg-neutral-900/90 text-neutral-800 dark:text-neutral-200 min-h-[32px]"
          >
            {currentRole === 'super_admin' ? (
              <>
                <ShieldCheck className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                <span className="font-semibold text-blue-700 dark:text-blue-300">
                  {userName ? userName.split(' ')[0] : 'Admin'}
                </span>
              </>
            ) : (
              <>
                <UserCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                  {userName ? userName.split(' ')[0] : 'Caissier'}
                </span>
              </>
            )}
          </div>

          <button
            id="btn-logout"
            onClick={async () => {
              const { signOut } = await import('@/lib/auth-client');
              await signOut();
              window.location.href = '/login';
            }}
            title="Se déconnecter"
            aria-label="Se déconnecter de la session"
            className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/40 px-2.5 py-1 rounded-full border border-red-200/60 dark:border-red-900/60 transition min-h-[32px] cursor-pointer"
          >
            Déconnexion
          </button>
        </div>

        {/* Link to /setup wizard */}
        <Link
          href="/setup"
          id="link-setup-wizard"
          title="Assistant Setup (/setup)"
          className="hidden xl:flex items-center gap-1 text-xs text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white px-2.5 py-1 rounded-full border border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 transition min-h-[32px]"
        >
          <Sparkles className="h-3 w-3" />
          <span>Setup</span>
        </Link>
      </div>
    </header>
  );
}
