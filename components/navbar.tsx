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
  Sparkles,
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
  const activeRouter = routers.find((r) => r.id === selectedRouterId) || routers[0];

  return (
    <header
      id="main-navbar"
      className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card/90 backdrop-blur-xl px-3 sm:px-5 transition-colors shadow-xs"
    >
      {/* ── LEFT: Brand + Drawer + Site Selector ── */}
      <div className="flex items-center gap-2 sm:gap-4 min-w-0">
        {/* Mobile Hamburger */}
        {onOpenMobileDrawer && (
          <button
            id="btn-open-mobile-drawer"
            onClick={onOpenMobileDrawer}
            aria-label="Ouvrir le menu de navigation"
            className="md:hidden p-2 text-muted-foreground hover:text-foreground rounded-xl hover:bg-muted transition min-h-[40px] min-w-[40px] flex items-center justify-center -ml-1 cursor-pointer"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}

        {/* Brand */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs transition-transform active:scale-95">
            <Wifi className="h-4 w-4 stroke-[2.2]" />
          </div>
          <div className="hidden sm:block">
            <div className="flex items-center gap-1.5 font-semibold tracking-tight text-foreground text-sm">
              <span>NetPulse</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-medium border border-border">
                2026
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-tight">
              Hotspot &amp; Core Network
            </p>
          </div>
        </div>

        {/* Site Selector */}
        <div className="flex items-center gap-2 pl-1 sm:pl-3 sm:border-l sm:border-border">
          <Server className="h-3.5 w-3.5 text-muted-foreground hidden md:block shrink-0" />
          <div className="relative">
            <select
              id="site-selector-dropdown"
              value={selectedRouterId}
              onChange={(e) => onSelectRouter(e.target.value)}
              className="appearance-none max-w-[120px] sm:max-w-[180px] md:max-w-none truncate bg-muted border border-border text-foreground text-xs rounded-full pl-2.5 sm:pl-3 pr-7 sm:pr-8 py-1.5 font-medium hover:bg-accent hover:text-accent-foreground transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">🌐 Tous les sites ({routers.length})</option>
              {routers.map((router) => (
                <option key={router.id} value={router.id}>
                  {router.name} ({router.host})
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-2 sm:right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
              <SlidersHorizontal className="h-3 w-3" />
            </div>
          </div>
        </div>

        {/* Live Status & Router Ping Telemetry */}
        <div className="hidden lg:flex items-center gap-2 text-xs bg-muted border border-border text-foreground px-3 py-1 rounded-full shadow-2xs">
          <span className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${
              activeRouter?.isOnline !== false ? 'bg-emerald-400 opacity-75' : 'bg-destructive opacity-75'
            }`} />
            <span className={`relative inline-flex rounded-full h-2 w-2 ${
              activeRouter?.isOnline !== false ? 'bg-emerald-500' : 'bg-destructive'
            }`} />
          </span>
          <span className="font-medium text-[11px] flex items-center gap-1.5">
            <span>{activeUsersCount} connectés</span>
            {activeRouter && (
              <>
                <span className="text-muted-foreground/60">•</span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {activeRouter.lastPing ? `${activeRouter.lastPing}ms` : 'ROS v7'}
                </span>
              </>
            )}
          </span>
        </div>
      </div>

      {/* ── RIGHT: Actions ── */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Command Palette */}
        {onOpenCommandPalette && (
          <button
            id="btn-navbar-command-palette"
            onClick={onOpenCommandPalette}
            title="Palette de Commandes (Cmd+K / Ctrl+K)"
            className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-full bg-muted hover:bg-accent hover:text-accent-foreground text-muted-foreground border border-border text-xs transition cursor-pointer"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="hidden md:inline text-[11px]">Rechercher</span>
            <kbd className="text-[10px] font-mono px-1 py-0.5 rounded bg-background border border-border hidden md:inline">
              ⌘K
            </kbd>
          </button>
        )}

        {/* PWA Install */}
        <div className="hidden sm:block">
          <PWAInstallButton variant="compact" />
        </div>

        {/* Refresh */}
        <button
          id="btn-refresh-network"
          onClick={onRefreshData}
          title="Rafraîchir les métriques"
          className="p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-primary' : ''}`} />
        </button>

        {/* Assistant IA */}
        {onOpenAssistant && (
          <button
            id="btn-navbar-assistant"
            onClick={onOpenAssistant}
            title="Ouvrir l'Assistant IA Gemini"
            className="hidden sm:flex items-center gap-1.5 bg-muted hover:bg-accent hover:text-accent-foreground active:scale-95 text-foreground border border-border text-xs font-medium px-3 py-1.5 rounded-full transition min-h-[36px] cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="hidden lg:inline">Assistant IA</span>
          </button>
        )}

        {/* Quick Generate */}
        <button
          id="btn-quick-generate"
          onClick={onOpenQuickGenerate}
          className="flex items-center gap-1.5 bg-primary hover:opacity-90 active:scale-95 text-primary-foreground text-xs font-medium px-3 sm:px-3.5 py-1.5 rounded-full shadow-xs transition min-h-[36px] cursor-pointer"
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
          className="p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
        >
          {mounted ? (
            theme === 'dark' ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )
          ) : (
            <div className="h-4 w-4" />
          )}
        </button>

        {/* Role + User + Logout */}
        <div className="flex items-center gap-1.5">
          <div
            id="user-role-badge"
            className="hidden md:flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full border border-border bg-muted text-foreground min-h-[32px]"
          >
            {currentRole === 'super_admin' ? (
              <>
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                <span className="font-semibold text-primary">
                  {userName ? userName.split(' ')[0] : 'Admin'}
                </span>
              </>
            ) : (
              <>
                <UserCheck className="h-3.5 w-3.5 text-emerald-500" />
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
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
            className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10 px-2.5 py-1 rounded-full border border-destructive/30 transition min-h-[32px] cursor-pointer"
          >
            Déconnexion
          </button>
        </div>

        {/* Setup link */}
        <Link
          href="/setup"
          id="link-setup-wizard"
          title="Assistant Setup (/setup)"
          className="hidden xl:flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2.5 py-1 rounded-full border border-border hover:border-muted-foreground transition min-h-[32px]"
        >
          <Sparkles className="h-3 w-3" />
          <span>Setup</span>
        </Link>
      </div>
    </header>
  );
}
