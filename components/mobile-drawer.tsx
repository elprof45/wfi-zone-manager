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
  Sparkles,
  X,
  Wifi,
  ShieldCheck,
  UserCheck,
  Cpu,
  Server,
  Users,
} from 'lucide-react';
import { NavigationSection } from './sidebar';
import { MikroTikRouter, UserRole } from '@/lib/types';
import { PWAInstallButton } from './pwa-install-button';
import Link from 'next/link';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentSection: NavigationSection;
  onSelectSection: (section: NavigationSection) => void;
  routers: MikroTikRouter[];
  selectedRouterId: string;
  onSelectRouter: (id: string) => void;
  currentRole: UserRole;
  onToggleRole: () => void;
  cpuAverage?: number;
  unclosedTicketsCount?: number;
  stockAlertCount?: number;
}

export function MobileDrawer({
  isOpen,
  onClose,
  currentSection,
  onSelectSection,
  routers,
  selectedRouterId,
  onSelectRouter,
  currentRole,
  onToggleRole,
  cpuAverage = 12,
  unclosedTicketsCount = 0,
  stockAlertCount = 0,
}: MobileDrawerProps) {
  if (!isOpen) return null;

  const navItems = [
    {
      id: 'dashboard' as NavigationSection,
      label: 'Tableau de bord',
      description: 'KPI temps réel & monitoring',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'routers' as NavigationSection,
      label: 'Routeurs MikroTik',
      description: 'Connexions API & santé CPU',
      icon: Router,
      badge: null,
    },
    {
      id: 'tickets' as NavigationSection,
      label: 'Tickets & Générateur',
      description: 'Création en masse & PDF',
      icon: Ticket,
      badge: null,
    },
    {
      id: 'profiles' as NavigationSection,
      label: 'Profils Hotspot',
      description: 'Tarifs & limites débits',
      icon: Zap,
      badge:
        stockAlertCount > 0 ? (
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-destructive text-destructive-foreground">
            {stockAlertCount}
          </span>
        ) : null,
    },
    {
      id: 'closure' as NavigationSection,
      label: 'Clôture de Caisse',
      description: 'Verrouillage & purge RAM',
      icon: LockKeyhole,
      badge:
        unclosedTicketsCount > 0 ? (
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-primary text-primary-foreground">
            {unclosedTicketsCount}
          </span>
        ) : null,
    },
    {
      id: 'reports' as NavigationSection,
      label: 'Rapports & Ventes',
      description: 'Analyse financière & filtres',
      icon: BarChart3,
      badge: null,
    },
    {
      id: 'users' as NavigationSection,
      label: 'Utilisateurs',
      description: 'Comptes, rôles & blocage',
      icon: Users,
      badge: null,
      adminOnly: true,
    },
    {
      id: 'assistant' as NavigationSection,
      label: 'Assistant IA Gemini',
      description: 'Diagnostic & questions réseau',
      icon: Sparkles,
      badge: (
        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-primary text-primary-foreground">
          IA
        </span>
      ),
    },
    {
      id: 'settings' as NavigationSection,
      label: 'Configurations Système',
      description: 'Telegram, PostgreSQL, SMTP',
      icon: Settings,
      badge: null,
    },
  ].filter((item) => {
    if ((item as any).adminOnly && currentRole !== 'super_admin' && currentRole !== 'admin') {
      return false;
    }
    return true;
  });

  return (
    <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end bg-background/80 backdrop-blur-md animate-in fade-in duration-200">
      {/* Tap backdrop to close */}
      <div className="flex-1" onClick={onClose} />

      {/* Drawer panel */}
      <div className="w-full max-h-[90vh] flex flex-col bg-card text-card-foreground rounded-t-3xl border-t border-border shadow-2xl overflow-hidden animate-in slide-in-from-bottom-6 duration-200">
        {/* Grab bar */}
        <div className="flex justify-center pt-2.5 pb-1">
          <div className="w-12 h-1.5 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-2.5 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs">
              <Wifi className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <span>NetPulse</span>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                  Mobile Pro
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">Gestion Hotspot & Core Network</p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Fermer le menu"
            className="p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Quick PWA Install Callout inside drawer */}
          <div className="p-3 rounded-2xl bg-muted/50 border border-border">
            <div className="text-xs font-semibold text-foreground mb-2">
              Application Mobile NetPulse
            </div>
            <PWAInstallButton variant="full" />
          </div>

          {/* Router Selection Dropdown */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Server className="h-3.5 w-3.5" />
              <span>Site MikroTik Actif</span>
            </label>
            <select
              value={selectedRouterId}
              onChange={(e) => onSelectRouter(e.target.value)}
              className="w-full bg-muted border border-border text-foreground text-xs font-medium rounded-xl p-2.5 focus:ring-1 focus:ring-primary focus:outline-none cursor-pointer"
            >
              <option value="all">🌐 Tous les sites ({routers.length})</option>
              {routers.map((router) => (
                <option key={router.id} value={router.id}>
                  {router.name} ({router.host})
                </option>
              ))}
            </select>
          </div>

          {/* Navigation Links */}
          <div className="space-y-1 pt-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80 px-1 mb-1">
              Navigation
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectSection(item.id);
                    onClose();
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition min-h-[48px] active:scale-[0.99] cursor-pointer ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-xs font-semibold'
                      : 'hover:bg-muted text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                    <div>
                      <div className="text-xs">{item.label}</div>
                      <p className={`text-[10px] ${isActive ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                        {item.description}
                      </p>
                    </div>
                  </div>
                  {item.badge}
                </button>
              );
            })}
          </div>

          {/* Role switcher & utilities */}
          <div className="pt-2 border-t border-border space-y-2">
            <button
              onClick={onToggleRole}
              className="w-full flex items-center justify-between p-2.5 rounded-xl border border-border text-xs font-medium text-foreground hover:bg-muted min-h-[44px] cursor-pointer"
            >
              <span className="flex items-center gap-2">
                {currentRole === 'super_admin' ? (
                  <ShieldCheck className="h-4 w-4 text-primary" />
                ) : (
                  <UserCheck className="h-4 w-4 text-emerald-600" />
                )}
                <span>Rôle Actif : {currentRole === 'super_admin' ? 'Super-Administrateur' : 'Caissier'}</span>
              </span>
              <span className="text-[10px] underline text-muted-foreground">Basculer</span>
            </button>

            <Link
              href="/setup"
              onClick={onClose}
              className="w-full flex items-center justify-between p-2.5 rounded-xl border border-border text-xs font-medium text-foreground hover:bg-muted min-h-[44px]"
            >
              <span className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span>Assistant Setup Initial</span>
              </span>
              <span className="text-[10px] text-muted-foreground">/setup →</span>
            </Link>

            {/* Hardware Status */}
            <div className="p-2.5 rounded-xl bg-muted text-xs flex items-center justify-between text-muted-foreground border border-border">
              <span className="flex items-center gap-1.5">
                <Cpu className="h-3.5 w-3.5" />
                <span>Charge CPU MikroTik</span>
              </span>
              <span className="font-mono font-bold text-foreground">
                {cpuAverage}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
