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
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white">
            {stockAlertCount} alertes
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
      id: 'closure' as NavigationSection,
      label: 'Clôture de Caisse',
      description: 'Verrouillage & purge RAM',
      icon: LockKeyhole,
      badge:
        unclosedTicketsCount > 0 ? (
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-slate-900">
            {unclosedTicketsCount}
          </span>
        ) : null,
    },
    {
      id: 'assistant' as NavigationSection,
      label: 'Assistant IA Gemini',
      description: 'Diagnostic & questions réseau',
      icon: Sparkles,
      badge: (
        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-neutral-900 text-white dark:bg-white dark:text-neutral-900">
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
  ];

  return (
    <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Tap backdrop to close */}
      <div className="flex-1" onClick={onClose} />

      {/* Drawer panel */}
      <div className="w-full max-h-[88vh] flex flex-col bg-white dark:bg-[#111113] rounded-t-3xl border-t border-black/[0.08] dark:border-white/[0.1] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-6 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-black dark:bg-white text-white dark:text-black">
              <Wifi className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-bold text-neutral-950 dark:text-white flex items-center gap-1.5">
                <span>NetPulse</span>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                  Mobile
                </span>
              </div>
              <p className="text-[11px] text-neutral-500">Gestion Hotspot & Core Network</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Quick PWA Install Callout inside drawer */}
          <div className="p-3 rounded-2xl bg-neutral-100/80 dark:bg-neutral-900/80 border border-neutral-200/80 dark:border-neutral-800">
            <div className="text-xs font-semibold text-neutral-900 dark:text-white mb-2">
              Application Mobile NetPulse
            </div>
            <PWAInstallButton variant="full" />
          </div>

          {/* Router Selection Dropdown */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
              <Server className="h-3.5 w-3.5" />
              <span>Site MikroTik Actif</span>
            </label>
            <select
              value={selectedRouterId}
              onChange={(e) => onSelectRouter(e.target.value)}
              className="w-full bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white text-xs font-medium rounded-xl p-2.5 focus:ring-1 focus:ring-black dark:focus:ring-white"
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
            <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 px-1 mb-1">
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
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition min-h-[48px] active:scale-[0.99] ${
                    isActive
                      ? 'bg-black text-white dark:bg-white dark:text-black shadow-sm font-semibold'
                      : 'hover:bg-neutral-100 dark:hover:bg-neutral-900 text-neutral-800 dark:text-neutral-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-white dark:text-black' : 'text-neutral-500'}`} />
                    <div>
                      <div className="text-xs">{item.label}</div>
                      <p className={`text-[10px] ${isActive ? 'text-neutral-300 dark:text-neutral-700' : 'text-neutral-400'}`}>
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
          <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 space-y-2">
            <button
              onClick={onToggleRole}
              className="w-full flex items-center justify-between p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 text-xs font-medium text-neutral-800 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-900 min-h-[44px]"
            >
              <span className="flex items-center gap-2">
                {currentRole === 'super_admin' ? (
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                ) : (
                  <UserCheck className="h-4 w-4 text-blue-600" />
                )}
                <span>Rôle Actif : {currentRole === 'super_admin' ? 'Super-Administrateur' : 'Gérant de Caisse'}</span>
              </span>
              <span className="text-[10px] underline text-neutral-400">Changer</span>
            </button>

            <Link
              href="/setup"
              onClick={onClose}
              className="w-full flex items-center justify-between p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 text-xs font-medium text-neutral-800 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-900 min-h-[44px]"
            >
              <span className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-neutral-500" />
                <span>Assistant Setup Initial</span>
              </span>
              <span className="text-[10px] text-neutral-400">/setup →</span>
            </Link>

            {/* Hardware Status */}
            <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 text-xs flex items-center justify-between text-neutral-500">
              <span className="flex items-center gap-1.5">
                <Cpu className="h-3.5 w-3.5" />
                <span>CPU MikroTik moyen</span>
              </span>
              <span className="font-mono font-bold text-neutral-900 dark:text-white">
                {cpuAverage}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
