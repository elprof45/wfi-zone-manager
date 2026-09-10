// components/command-palette.tsx
// Global Command Palette triggered with Cmd+K / Ctrl+K

'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  LayoutDashboard,
  Router,
  Ticket,
  Zap,
  BarChart3,
  LockKeyhole,
  Users,
  Settings,
  Sparkles,
  Printer,
  Trash2,
  DollarSign,
  X,
  CornerDownLeft,
  ArrowRight,
} from 'lucide-react';
import { NavigationSection } from './sidebar';
import { HotspotTicket } from '@/lib/types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (section: NavigationSection) => void;
  onQuickGenerate?: () => void;
  onTriggerClosure?: () => void;
  onPurgeRam?: () => void;
  tickets?: HotspotTicket[];
  onSellTicket?: (ticketId: string) => void;
}

export function CommandPalette({
  isOpen,
  onClose,
  onNavigate,
  onQuickGenerate,
  onTriggerClosure,
  onPurgeRam,
  tickets = [],
  onSellTicket,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Global keydown listener for Cmd+K / Ctrl+K and Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Build items
  const navigationItems = [
    { id: 'nav-dashboard', label: 'Aller au Tableau de Bord', category: 'Navigation', icon: LayoutDashboard, action: () => onNavigate('dashboard') },
    { id: 'nav-routers', label: 'Gérer les Routeurs MikroTik', category: 'Navigation', icon: Router, action: () => onNavigate('routers') },
    { id: 'nav-tickets', label: 'Tickets & Planches d\'impression', category: 'Navigation', icon: Ticket, action: () => onNavigate('tickets') },
    { id: 'nav-profiles', label: 'Profils & Tarifs Hotspot', category: 'Navigation', icon: Zap, action: () => onNavigate('profiles') },
    { id: 'nav-reports', label: 'Rapports & Ventes consolidées', category: 'Navigation', icon: BarChart3, action: () => onNavigate('reports') },
    { id: 'nav-closure', label: 'Clôture de Caisse Journalière', category: 'Navigation', icon: LockKeyhole, action: () => onNavigate('closure') },
    { id: 'nav-users', label: 'Gestion des Utilisateurs & Caissiers', category: 'Navigation', icon: Users, action: () => onNavigate('users') },
    { id: 'nav-settings', label: 'Configurations (SMTP, Telegram, DB)', category: 'Navigation', icon: Settings, action: () => onNavigate('settings') },
    { id: 'nav-assistant', label: 'Assistant IA Réseau Gemini', category: 'Navigation', icon: Sparkles, action: () => onNavigate('assistant') },
  ];

  const actionItems = [
    {
      id: 'act-generate',
      label: 'Générer un Nouveau Lot de Fiches',
      category: 'Actions Rapides',
      icon: Ticket,
      action: () => {
        onNavigate('tickets');
        if (onQuickGenerate) onQuickGenerate();
      },
    },
    {
      id: 'act-closure',
      label: 'Arrêter et Sceller la Caisse du Jour',
      category: 'Actions Rapides',
      icon: LockKeyhole,
      action: () => {
        onNavigate('closure');
        if (onTriggerClosure) onTriggerClosure();
      },
    },
    {
      id: 'act-purge',
      label: 'Purger la RAM MikroTik & Sessions Expirées',
      category: 'Actions Rapides',
      icon: Trash2,
      action: () => {
        if (onPurgeRam) onPurgeRam();
      },
    },
  ];

  // Match search
  const q = query.toLowerCase().trim();

  // Search matching tickets
  const matchingTickets = q
    ? tickets
        .filter((t) => t.code.toLowerCase().includes(q) || t.profileName.toLowerCase().includes(q))
        .slice(0, 5)
        .map((t) => ({
          id: `tkt-${t.id}`,
          label: `Coupon ${t.code} (${t.profileName} - ${t.price} ${t.currency})`,
          category: 'Tickets Trouvés',
          icon: Ticket,
          badge: t.status === 'available' ? 'Disponible' : t.status === 'active' ? 'En cours' : 'Consommé',
          action: () => {
            onNavigate('tickets');
            if (t.status === 'available' && onSellTicket) {
              onSellTicket(t.id);
            }
          },
        }))
    : [];

  const filteredNav = navigationItems.filter((i) => !q || i.label.toLowerCase().includes(q));
  const filteredActions = actionItems.filter((i) => !q || i.label.toLowerCase().includes(q));

  const allItems = [...matchingTickets, ...filteredActions, ...filteredNav];

  const handleSelect = (index: number) => {
    const item = allItems[index];
    if (item) {
      item.action();
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, allItems.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + allItems.length) % Math.max(1, allItems.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleSelect(selectedIndex);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 sm:pt-28 px-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      {/* Backdrop click to close */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Palette Modal */}
      <div className="relative w-full max-w-xl bg-white dark:bg-[#141416] rounded-2xl shadow-2xl border border-black/[0.08] dark:border-white/[0.1] overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Search Header */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-neutral-100 dark:border-neutral-800">
          <Search className="h-4 w-4 text-neutral-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Rechercher une action, une vue ou un code ticket..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none"
          />
          <div className="flex items-center gap-1.5">
            <kbd className="hidden sm:inline-flex px-1.5 py-0.5 text-[10px] font-mono text-neutral-400 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded">
              ESC
            </kbd>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Results List */}
        <div className="max-h-[60vh] overflow-y-auto p-2 space-y-1">
          {allItems.length === 0 ? (
            <div className="py-10 text-center text-xs text-neutral-400">
              Aucun résultat pour &ldquo;{query}&rdquo;
            </div>
          ) : (
            allItems.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelect(idx)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs transition cursor-pointer ${
                    isSelected
                      ? 'bg-neutral-100 dark:bg-neutral-800 text-black dark:text-white font-medium'
                      : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-900'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className={`h-4 w-4 shrink-0 ${isSelected ? 'text-black dark:text-white' : 'text-neutral-400'}`} />
                    <span className="truncate">{item.label}</span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {(item as any).badge && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200">
                        {(item as any).badge}
                      </span>
                    )}
                    <span className="text-[10px] text-neutral-400 hidden sm:inline">
                      {item.category}
                    </span>
                    {isSelected && (
                      <CornerDownLeft className="h-3 w-3 text-neutral-400" />
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 bg-neutral-50 dark:bg-neutral-900/60 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-[11px] text-neutral-400">
          <div className="flex items-center gap-3">
            <span>↑↓ pour naviguer</span>
            <span>↵ pour valider</span>
          </div>
          <span>NetPulse Command Suite</span>
        </div>
      </div>
    </div>
  );
}
