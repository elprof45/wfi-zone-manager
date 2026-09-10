'use client';

import React from 'react';
import {
  LayoutDashboard,
  Router,
  Ticket,
  Zap,
  BarChart3,
  LockKeyhole,
  Settings,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Cpu,
  HardDrive,
  Database,
  Sparkles,
  Users,
} from 'lucide-react';
import { PWAInstallButton } from './pwa-install-button';
import { UserRole } from '@/lib/types';

export type NavigationSection =
  | 'dashboard'
  | 'routers'
  | 'tickets'
  | 'profiles'
  | 'reports'
  | 'closure'
  | 'users'
  | 'assistant'
  | 'settings';

interface SidebarProps {
  currentSection: NavigationSection;
  onSelectSection: (section: NavigationSection) => void;
  stockAlertCount?: number;
  unclosedTicketsCount?: number;
  cpuAverage?: number;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  currentUserRole?: UserRole;
}

export function Sidebar({
  currentSection,
  onSelectSection,
  stockAlertCount = 0,
  unclosedTicketsCount = 0,
  cpuAverage = 12,
  isCollapsed,
  onToggleCollapse,
  currentUserRole = 'super_admin',
}: SidebarProps) {
  const navItems = [
    {
      id: 'dashboard' as NavigationSection,
      label: 'Dashboard',
      description: 'Vue globale & KPI',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'routers' as NavigationSection,
      label: 'Routeurs MikroTik',
      description: 'Santé & monitoring',
      icon: Router,
      badge: null,
    },
    {
      id: 'tickets' as NavigationSection,
      label: 'Tickets & Générateur',
      description: 'Masse & planches',
      icon: Ticket,
      badge: null,
    },
    {
      id: 'profiles' as NavigationSection,
      label: 'Profils Hotspot',
      description: 'Vitesses & tarifs',
      icon: Zap,
      badge: stockAlertCount > 0 ? (
        <span className="flex h-5 items-center px-1.5 rounded-full text-[10px] font-bold bg-rose-500 text-white animate-pulse">
          {stockAlertCount}
        </span>
      ) : null,
    },
    {
      id: 'reports' as NavigationSection,
      label: 'Rapports & Ventes',
      description: 'TanStack Table & exports',
      icon: BarChart3,
      badge: null,
    },
    {
      id: 'closure' as NavigationSection,
      label: 'Clôture de Caisse',
      description: 'Verrouillage & purge',
      icon: LockKeyhole,
      badge: unclosedTicketsCount > 0 ? (
        <span className="flex h-5 items-center px-1.5 rounded-full text-[10px] font-bold bg-amber-500 text-slate-900">
          {unclosedTicketsCount}
        </span>
      ) : null,
    },
    {
      id: 'users' as NavigationSection,
      label: 'Utilisateurs',
      description: 'Comptes & rôles',
      icon: Users,
      badge: null,
      adminOnly: true,
    },
    {
      id: 'assistant' as NavigationSection,
      label: 'Assistant IA',
      description: 'Chat Gemini multi-tours',
      icon: Sparkles,
      badge: (
        <span className="flex h-4 items-center px-1.5 rounded-full text-[9px] font-semibold bg-neutral-900 text-white dark:bg-white dark:text-neutral-900">
          AI
        </span>
      ),
    },
    {
      id: 'settings' as NavigationSection,
      label: 'Configurations',
      description: 'Telegram, SMTP, DB',
      icon: Settings,
      badge: null,
    },
  ];

  const visibleNavItems = navItems.filter((item) => {
    if ((item as any).adminOnly && currentUserRole !== 'super_admin' && currentUserRole !== 'admin') {
      return false;
    }
    return true;
  });

  return (
    <aside
      id="main-sidebar"
      className={`hidden md:flex sticky top-16 z-20 flex-col justify-between border-r border-black/[0.06] dark:border-white/[0.08] bg-white/70 dark:bg-black/70 backdrop-blur-xl transition-all duration-300 select-none ${
        isCollapsed ? 'w-16' : 'w-64'
      } h-[calc(100vh-4rem)]`}
    >
      {/* Top Nav Items */}
      <div className="p-3 space-y-1 overflow-y-auto">
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentSection === item.id;
          return (
            <button
              key={item.id}
              id={`nav-${item.id}`}
              onClick={() => onSelectSection(item.id)}
              title={item.label}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-xs sm:text-sm font-medium transition group relative ${
                isActive
                  ? 'bg-black text-white dark:bg-white dark:text-black shadow-sm'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100/90 dark:hover:bg-neutral-900/90'
              }`}
            >
              <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-white dark:text-black' : 'text-neutral-400 group-hover:text-neutral-800 dark:group-hover:text-neutral-200'}`} />
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="truncate">{item.label}</span>
                    {item.badge}
                  </div>
                  <p className={`text-[10px] truncate ${isActive ? 'text-neutral-300 dark:text-neutral-700' : 'text-neutral-400 dark:text-neutral-500'}`}>
                    {item.description}
                  </p>
                </div>
              )}
              {isCollapsed && item.badge && (
                <div className="absolute top-1.5 right-1.5">
                  {item.badge}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom MikroTik Protection & Collapse Control */}
      <div className="p-3 border-t border-black/[0.06] dark:border-white/[0.08] space-y-2">
        {!isCollapsed && (
          <div className="mb-1">
            <PWAInstallButton variant="sidebar" />
          </div>
        )}

        {!isCollapsed ? (
          <div className="rounded-xl p-2.5 bg-neutral-100/80 dark:bg-neutral-900/80 border border-neutral-200/80 dark:border-neutral-800 text-xs space-y-1.5">
            <div className="flex items-center justify-between font-medium text-neutral-800 dark:text-neutral-200">
              <span className="flex items-center gap-1.5 text-[11px]">
                <Cpu className="h-3 w-3 text-neutral-500" />
                <span>MikroTik Guard</span>
              </span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-neutral-200/80 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-neutral-300/60 dark:border-neutral-700">
                CPU {cpuAverage}%
              </span>
            </div>
            <p className="text-[10px] text-neutral-500 dark:text-neutral-400 leading-tight">
              Throttling 20 fiches / 50ms (RB951Ui &lt; 15%)
            </p>
          </div>
        ) : (
          <div className="flex justify-center" title={`CPU MikroTik moyen: ${cpuAverage}%`}>
            <Cpu className="h-4 w-4 text-neutral-400" />
          </div>
        )}

        <button
          id="btn-toggle-sidebar"
          onClick={onToggleCollapse}
          className="w-full flex items-center justify-center p-1.5 rounded-xl text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900 transition"
          title={isCollapsed ? 'Agrandir la barre latérale' : 'Réduire la barre latérale'}
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
    </aside>
  );
}
