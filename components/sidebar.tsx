'use client';

import React, { useEffect } from 'react';
import {
  LayoutDashboard,
  Router,
  Ticket,
  Zap,
  BarChart3,
  LockKeyhole,
  Settings,
  Cpu,
  Sparkles,
  Users,
  PanelLeftClose,
  PanelLeftOpen,
  Activity,
  ChevronRight,
} from 'lucide-react';
import { PWAInstallButton } from './pwa-install-button';
import { UserRole } from '@/lib/types';

export type NavigationSection =
  | 'dashboard'
  | 'routers'
  | 'monitoring'
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
  activeUsersTotal?: number;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  currentUserRole?: UserRole;
}

interface NavGroup {
  title: string;
  items: Array<{
    id: NavigationSection;
    label: string;
    description: string;
    icon: React.ElementType;
    badge?: React.ReactNode;
    adminOnly?: boolean;
  }>;
}

export function Sidebar({
  currentSection,
  onSelectSection,
  stockAlertCount = 0,
  unclosedTicketsCount = 0,
  cpuAverage = 12,
  activeUsersTotal = 0,
  isCollapsed,
  onToggleCollapse,
  currentUserRole = 'super_admin',
}: SidebarProps) {
  // Shortcut Cmd+B / Ctrl+B to toggle sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        onToggleCollapse();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onToggleCollapse]);

  const navGroups: NavGroup[] = [
    {
      title: 'Supervision',
      items: [
        {
          id: 'dashboard',
          label: 'Tableau de bord',
          description: 'Métriques & KPI en temps réel',
          icon: LayoutDashboard,
        },
        {
          id: 'routers',
          label: 'Routeurs MikroTik',
          description: 'Santé RouterOS & liaisons API',
          icon: Router,
        },
        {
          id: 'monitoring',
          label: 'Monitoring & Cron',
          description: 'Télémétrie RouterOS & worker',
          icon: Activity,
        },
        {
          id: 'assistant',
          label: 'Assistant IA Gemini',
          description: 'Diagnostic & requêtes réseau',
          icon: Sparkles,
          badge: (
            <span className="flex h-4 items-center px-1.5 rounded-full text-[9px] font-bold bg-primary text-primary-foreground shadow-xs">
              AI
            </span>
          ),
        },
      ],
    },
    {
      title: 'Ventes & Caisse',
      items: [
        {
          id: 'tickets',
          label: 'Tickets & Fiches',
          description: 'Génération en masse & reçus PDF',
          icon: Ticket,
        },
        {
          id: 'profiles',
          label: 'Profils Hotspot',
          description: 'Vitesses, validité & tarification',
          icon: Zap,
          badge: stockAlertCount > 0 ? (
            <span className="flex h-4 items-center px-1.5 rounded-full text-[9px] font-bold bg-destructive text-destructive-foreground animate-pulse">
              {stockAlertCount}
            </span>
          ) : null,
        },
        {
          id: 'closure',
          label: 'Clôture de Caisse',
          description: 'Arrêté journalier & verrous',
          icon: LockKeyhole,
          badge: unclosedTicketsCount > 0 ? (
            <span className="flex h-4 items-center px-1.5 rounded-full text-[9px] font-bold bg-primary text-primary-foreground">
              {unclosedTicketsCount}
            </span>
          ) : null,
        },
        {
          id: 'reports',
          label: 'Rapports & Ventes',
          description: 'Analytics, filtres & comptabilité',
          icon: BarChart3,
        },
      ],
    },
    {
      title: 'Système',
      items: [
        {
          id: 'users',
          label: 'Utilisateurs',
          description: 'Comptes caissiers & permissions',
          icon: Users,
          adminOnly: true,
        },
        {
          id: 'settings',
          label: 'Paramètres Système',
          description: 'Telegram, Discord, SMTP & DB',
          icon: Settings,
        },
      ],
    },
  ];

  const filterItems = (items: NavGroup['items']) => {
    return items.filter((item) => {
      if (item.adminOnly && currentUserRole !== 'super_admin' && currentUserRole !== 'admin') {
        return false;
      }
      return true;
    });
  };

  return (
    <aside
      id="main-sidebar"
      aria-label="Barre latérale de navigation"
      className={`hidden md:flex sticky top-16 z-20 flex-col justify-between border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-300 ease-in-out select-none shadow-xs ${
        isCollapsed ? 'w-[72px]' : 'w-64'
      } h-[calc(100vh-4rem)]`}
    >
      {/* Top Header Controls: Toggle Collapse */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-sidebar-border/60">
        {!isCollapsed && (
          <div className="flex items-center gap-2 min-w-0">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-[11px] font-semibold tracking-wider uppercase text-muted-foreground truncate">
              Navigation Pro
            </span>
          </div>
        )}

        <button
          id="btn-toggle-sidebar"
          onClick={onToggleCollapse}
          title={isCollapsed ? 'Agrandir la barre latérale (Cmd+B)' : 'Réduire la barre latérale (Cmd+B)'}
          aria-label={isCollapsed ? 'Agrandir la barre latérale' : 'Réduire la barre latérale'}
          className={`p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-all cursor-pointer ${
            isCollapsed ? 'mx-auto' : 'ml-auto'
          }`}
        >
          {isCollapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Nav Groups Container */}
      <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4">
        {navGroups.map((group, groupIdx) => {
          const visibleGroupItems = filterItems(group.items);
          if (visibleGroupItems.length === 0) return null;

          return (
            <div key={group.title} className="space-y-1">
              {!isCollapsed ? (
                <div className="px-2 pb-1 text-[10px] font-bold tracking-wider uppercase text-muted-foreground/80">
                  {group.title}
                </div>
              ) : groupIdx > 0 ? (
                <div className="my-2 border-t border-sidebar-border/60 mx-1.5" />
              ) : null}

              <div className="space-y-1">
                {visibleGroupItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentSection === item.id;

                  return (
                    <button
                      key={item.id}
                      id={`nav-${item.id}`}
                      onClick={() => onSelectSection(item.id)}
                      title={isCollapsed ? `${item.label} — ${item.description}` : item.label}
                      className={`w-full flex items-center gap-3 rounded-xl text-left text-xs font-medium transition-all group relative cursor-pointer ${
                        isCollapsed ? 'justify-center p-2.5' : 'px-3 py-2.5'
                      } ${
                        isActive
                          ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm font-semibold'
                          : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                      }`}
                    >
                      {/* Left accent bar when active */}
                      {isActive && !isCollapsed && (
                        <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-primary" />
                      )}

                      <Icon
                        className={`h-4 w-4 shrink-0 transition-transform group-hover:scale-105 ${
                          isActive
                            ? 'text-sidebar-primary-foreground stroke-[2.2]'
                            : 'text-muted-foreground group-hover:text-sidebar-accent-foreground stroke-[1.8]'
                        }`}
                      />

                      {!isCollapsed && (
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="truncate">{item.label}</span>
                            {item.badge}
                          </div>
                          <p
                            className={`text-[10px] truncate ${
                              isActive
                                ? 'text-sidebar-primary-foreground/80'
                                : 'text-muted-foreground'
                            }`}
                          >
                            {item.description}
                          </p>
                        </div>
                      )}

                      {/* Floating badge for collapsed mode */}
                      {isCollapsed && item.badge && (
                        <div className="absolute top-1 right-1">
                          {item.badge}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Health Widget & PWA Control */}
      <div className="p-3 border-t border-sidebar-border bg-sidebar-accent/30 space-y-2">
        {!isCollapsed && (
          <div className="mb-1">
            <PWAInstallButton variant="sidebar" />
          </div>
        )}

        {!isCollapsed ? (
          <div className="rounded-xl p-2.5 bg-card border border-border text-card-foreground text-xs space-y-1.5 shadow-2xs">
            <div className="flex items-center justify-between font-semibold">
              <span className="flex items-center gap-1.5 text-[11px] text-foreground">
                <Activity className="h-3 w-3 text-primary animate-pulse" />
                <span>RouterOS Monitor</span>
              </span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-muted text-muted-foreground border border-border">
                CPU {cpuAverage}%
              </span>
            </div>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>Usagers en ligne :</span>
              <span className="font-semibold text-foreground font-mono">{activeUsersTotal}</span>
            </div>
          </div>
        ) : (
          <div
            className="flex justify-center p-1 cursor-help"
            title={`RouterOS Monitor: CPU ${cpuAverage}%, ${activeUsersTotal} usagers`}
          >
            <div className="relative">
              <Cpu className="h-4 w-4 text-muted-foreground hover:text-primary transition" />
              {cpuAverage > 50 && (
                <span className="absolute -top-1 -right-1 flex h-2 w-2 rounded-full bg-destructive" />
              )}
            </div>
          </div>
        )}

        {/* Keyboard shortcut hint */}
        {!isCollapsed && (
          <div className="text-[10px] text-center text-muted-foreground flex items-center justify-center gap-1">
            <span>Raccourci</span>
            <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono text-[9px]">
              ⌘B
            </kbd>
            <span>pour réduire</span>
          </div>
        )}
      </div>
    </aside>
  );
}
