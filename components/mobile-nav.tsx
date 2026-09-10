'use client';

import React from 'react';
import {
  LayoutDashboard,
  Router,
  Ticket,
  LockKeyhole,
  Menu,
  Sparkles,
} from 'lucide-react';
import { NavigationSection } from './sidebar';

interface MobileNavProps {
  currentSection: NavigationSection;
  onSelectSection: (section: NavigationSection) => void;
  onOpenDrawer: () => void;
  unclosedTicketsCount?: number;
  stockAlertCount?: number;
}

export function MobileNav({
  currentSection,
  onSelectSection,
  onOpenDrawer,
  unclosedTicketsCount = 0,
  stockAlertCount = 0,
}: MobileNavProps) {
  const items = [
    {
      id: 'dashboard' as NavigationSection,
      label: 'Accueil',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'routers' as NavigationSection,
      label: 'Routeurs',
      icon: Router,
      badge: null,
    },
    {
      id: 'tickets' as NavigationSection,
      label: 'Tickets',
      icon: Ticket,
      badge: null,
    },
    {
      id: 'closure' as NavigationSection,
      label: 'Caisse',
      icon: LockKeyhole,
      badge:
        unclosedTicketsCount > 0 ? (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground px-1 shadow-xs">
            {unclosedTicketsCount > 99 ? '99+' : unclosedTicketsCount}
          </span>
        ) : null,
    },
    {
      id: 'assistant' as NavigationSection,
      label: 'IA Gemini',
      icon: Sparkles,
      badge: null,
    },
  ];

  return (
    <nav
      id="mobile-bottom-navbar"
      aria-label="Navigation mobile"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/90 backdrop-blur-xl border-t border-border px-2 py-1.5 pb-[max(0.6rem,env(safe-area-inset-bottom))] shadow-lg"
    >
      <div className="flex items-center justify-around">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = currentSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectSection(item.id)}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all relative min-h-[48px] min-w-[56px] active:scale-95 cursor-pointer ${
                isActive
                  ? 'text-primary font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="relative">
                <Icon
                  className={`h-5 w-5 transition-transform ${
                    isActive ? 'scale-110 stroke-[2.3] text-primary' : 'stroke-[1.8]'
                  }`}
                />
                {item.badge}
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight">{item.label}</span>
              {isActive && (
                <span className="absolute bottom-0 h-0.5 w-5 rounded-full bg-primary" />
              )}
            </button>
          );
        })}

        {/* More / Menu Drawer Toggle */}
        <button
          onClick={onOpenDrawer}
          className="flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-muted-foreground hover:text-foreground transition-all min-h-[48px] min-w-[56px] active:scale-95 cursor-pointer"
          title="Ouvrir le menu complet"
          aria-label="Ouvrir le menu complet"
        >
          <div className="relative">
            <Menu className="h-5 w-5 stroke-[1.8]" />
            {stockAlertCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-2 w-2 rounded-full bg-destructive animate-pulse" />
            )}
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">Menu</span>
        </button>
      </div>
    </nav>
  );
}
