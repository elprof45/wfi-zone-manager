'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/navbar';
import { Sidebar, NavigationSection } from '@/components/sidebar';
import { MobileNav } from '@/components/mobile-nav';
import { MobileDrawer } from '@/components/mobile-drawer';
import { DashboardView } from '@/components/views/dashboard-view';
import { RoutersView } from '@/components/views/routers-view';
import { TicketsView } from '@/components/views/tickets-view';
import { ProfilesView } from '@/components/views/profiles-view';
import { ReportsView } from '@/components/views/reports-view';
import { ClosureView } from '@/components/views/closure-view';
import { SettingsView } from '@/components/views/settings-view';
import { AssistantView } from '@/components/views/assistant-view';
import { UsersView } from '@/components/views/users-view';
import { CommandPalette } from '@/components/command-palette';
import { MikroTikRouter, HotspotProfile, HotspotTicket, DailyClosure, UserRole } from '@/lib/types';
import { RefreshCw, Sparkles, X, Wifi } from 'lucide-react';
import Link from 'next/link';

import { useSession } from '@/lib/auth-client';

export default function HomePage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  // Navigation & UI State
  const [currentSection, setCurrentSection] = useState<NavigationSection>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [selectedRouterId, setSelectedRouterId] = useState<string>('all');
  const [currentRole, setCurrentRole] = useState<UserRole>('super_admin');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showSetupBanner, setShowSetupBanner] = useState(true);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Auth guard: redirect to /login if unauthenticated
  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push('/login');
    }
  }, [isPending, session, router]);

  // Sync role from Better-Auth session when available
  useEffect(() => {
    if (session?.user?.role) {
      setCurrentRole(session.user.role as UserRole);
    }
  }, [session]);

  // Core Data
  const [routers, setRouters] = useState<MikroTikRouter[]>([]);
  const [profiles, setProfiles] = useState<HotspotProfile[]>([]);
  const [tickets, setTickets] = useState<HotspotTicket[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [closureData, setClosureData] = useState<{
    unclosedStats: any;
    closures: DailyClosure[];
  }>({
    unclosedStats: { totalRevenue: 0, ticketsCount: 0, currency: 'FCFA', breakdown: [], lastClosureTime: null },
    closures: [],
  });
  const [config, setConfig] = useState<any>(null);

  // Fetch all live data
  const fetchData = useCallback(async (isManual = false) => {
    if (isManual) {
      setIsRefreshing(true);
    }
    try {
      // 1. Fetch Routers
      const rtrRes = await fetch('/api/routers');
      if (rtrRes.ok) {
        const rtrData = await rtrRes.json();
        setRouters(rtrData);
      }

      // 2. Fetch Profiles
      const profRes = await fetch('/api/profiles');
      if (profRes.ok) {
        const profData = await profRes.json();
        setProfiles(profData);
      }

      // 3. Fetch Tickets
      const tktRes = await fetch('/api/tickets?pageSize=100');
      if (tktRes.ok) {
        const tktData = await tktRes.json();
        setTickets(tktData.tickets || []);
      }

      // 4. Fetch Metrics
      const metRes = await fetch(`/api/metrics?routerId=${selectedRouterId}`);
      if (metRes.ok) {
        const metData = await metRes.json();
        setMetrics(metData);
      }

      // 5. Fetch Closures
      const closRes = await fetch(`/api/closure?routerId=${selectedRouterId}`);
      if (closRes.ok) {
        const closData = await closRes.json();
        setClosureData(closData);
      }

      // 6. Fetch Setup Status
      const stRes = await fetch('/api/setup/status');
      if (stRes.ok) {
        const stData = await stRes.json();
        setConfig(stData.config);
      }
    } catch (err) {
      console.error('Error fetching dashboard data', err);
    } finally {
      if (isManual) {
        setIsRefreshing(false);
      }
    }
  }, [selectedRouterId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchData]);

  // Role toggle
  const handleToggleRole = () => {
    setCurrentRole((prev) => (prev === 'super_admin' ? 'cashier' : 'super_admin'));
  };

  // Trigger quick generate
  const handleOpenQuickGenerate = () => {
    setCurrentSection('tickets');
  };

  // Execute daily closure
  const handleExecuteClosure = async (routerId: string, notes?: string) => {
    const res = await fetch('/api/closure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ routerId, notes }),
    });
    const data = await res.json();
    fetchData();
    return data;
  };

  // Purge router RAM
  const handlePurgeRouter = async (routerId: string) => {
    const res = await fetch('/api/routers', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: routerId, action: 'purge_expired' }),
    });
    const data = await res.json();
    fetchData();
    return data;
  };

  const activeUsersTotal = routers.reduce(
    (acc, r) => acc + (r.hardware?.activeUsersCount || 0),
    0
  );

  const currency = config?.general?.currency || 'FCFA';
  const stockAlertCount = metrics?.stockAlerts?.length || 0;
  const unclosedTicketsCount = closureData.unclosedStats?.ticketsCount || 0;
  const cpuAverage = metrics?.hardware?.cpuPercent || 11;

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Wifi className="w-7 h-7 text-primary animate-pulse" />
            </div>
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-50" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-primary" />
            </span>
          </div>
          <div className="text-center space-y-1">
            <p className="text-sm font-semibold text-foreground">NetPulse</p>
            <p className="text-xs text-muted-foreground">Initialisation de votre session...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col antialiased">
      {/* Top Navbar */}
      <Navbar
        routers={routers}
        selectedRouterId={selectedRouterId}
        onSelectRouter={setSelectedRouterId}
        activeUsersCount={activeUsersTotal}
        currentRole={currentRole}
        userName={session?.user?.name || undefined}
        onToggleRole={handleToggleRole}
        onOpenQuickGenerate={handleOpenQuickGenerate}
        onRefreshData={fetchData}
        isRefreshing={isRefreshing}
        onOpenAssistant={() => setCurrentSection('assistant')}
        onOpenMobileDrawer={() => setIsMobileDrawerOpen(true)}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
      />

      {/* Setup Wizard Announcement Banner */}
      {showSetupBanner && !config?.isSetupCompleted && (
        <div className="bg-primary/5 border-b border-primary/20 px-4 py-2.5 text-xs font-medium flex items-center justify-between">
          <div className="flex items-center gap-2 max-w-4xl mx-auto flex-1 min-w-0">
            <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary" />
            <span className="text-foreground truncate">
              <strong className="font-semibold">Configuration initiale :</strong>{' '}
              <span className="text-muted-foreground hidden sm:inline">Lancez l&apos;assistant pour configurer PostgreSQL, SMTP, Telegram &amp; MikroTik.</span>
            </span>
            <Link
              href="/setup"
              className="ml-2 bg-primary text-primary-foreground font-medium text-xs px-3 py-1 rounded-full hover:opacity-90 transition shrink-0"
            >
              Setup →
            </Link>
          </div>
          <button
            onClick={() => setShowSetupBanner(false)}
            className="text-muted-foreground hover:text-foreground ml-2 transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Main Body Layout */}
      <div className="flex-1 flex">
        {/* Left Sidebar */}
        <Sidebar
          currentSection={currentSection}
          onSelectSection={setCurrentSection}
          stockAlertCount={stockAlertCount}
          unclosedTicketsCount={unclosedTicketsCount}
          cpuAverage={cpuAverage}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          currentUserRole={currentRole}
        />

        {/* Content Area */}
        <main
          id="main-content-area"
          className="flex-1 min-w-0 p-3 sm:p-5 lg:p-7 max-w-7xl mx-auto w-full space-y-4 sm:space-y-6 overflow-x-hidden pb-24 md:pb-8"
        >
          {currentSection === 'dashboard' && (
            <DashboardView
              metrics={metrics}
              onNavigate={setCurrentSection}
              onQuickGenerate={handleOpenQuickGenerate}
              onTriggerClosure={() => setCurrentSection('closure')}
              onPurgeRam={() => {
                if (routers.length > 0) handlePurgeRouter(routers[0].id);
              }}
              currency={currency}
            />
          )}

          {currentSection === 'routers' && (
            <RoutersView
              routers={routers}
              onRefresh={fetchData}
              onPurgeRouter={handlePurgeRouter}
            />
          )}

          {currentSection === 'tickets' && (
            <TicketsView
              tickets={tickets}
              profiles={profiles}
              routers={routers}
              onRefresh={fetchData}
              currency={currency}
            />
          )}

          {currentSection === 'profiles' && (
            <ProfilesView
              profiles={profiles}
              onRefresh={fetchData}
              onGenerateForProfile={(profId) => {
                setCurrentSection('tickets');
              }}
              currency={currency}
            />
          )}

          {currentSection === 'reports' && (
            <ReportsView
              tickets={tickets}
              profiles={profiles}
              routers={routers}
              currency={currency}
            />
          )}

          {currentSection === 'closure' && (
            <ClosureView
              unclosedStats={closureData.unclosedStats}
              closures={closureData.closures}
              routers={routers}
              onExecuteClosure={handleExecuteClosure}
              currency={currency}
            />
          )}

          {currentSection === 'users' && (
            <UsersView
              currentUserId={session?.user?.id}
              currentUserRole={currentRole}
            />
          )}

          {currentSection === 'assistant' && (
            <AssistantView
              networkMetrics={{
                routersCount: routers.length,
                activeUsersCount: metrics?.activeHotspotUsers ?? 0,
                todayRevenue: metrics?.todayRevenue ?? 0,
                currency,
                cpuAverage: metrics?.cpuAverage ?? 12,
                ticketsSoldCount: metrics?.todayTicketsSold ?? 0,
              }}
            />
          )}

          {currentSection === 'settings' && (
            <SettingsView
              config={config}
              onRefresh={fetchData}
            />
          )}
        </main>
      </div>

      {/* Mobile Drawer (Full Navigation Menu & Fast Actions) */}
      <MobileDrawer
        isOpen={isMobileDrawerOpen}
        onClose={() => setIsMobileDrawerOpen(false)}
        currentSection={currentSection}
        onSelectSection={setCurrentSection}
        routers={routers}
        selectedRouterId={selectedRouterId}
        onSelectRouter={setSelectedRouterId}
        currentRole={currentRole}
        onToggleRole={handleToggleRole}
        stockAlertCount={stockAlertCount}
        unclosedTicketsCount={unclosedTicketsCount}
        cpuAverage={cpuAverage}
      />

      {/* Mobile Bottom Navigation (Persistent PWA Bottom Bar) */}
      <MobileNav
        currentSection={currentSection}
        onSelectSection={setCurrentSection}
        onOpenDrawer={() => setIsMobileDrawerOpen(true)}
        stockAlertCount={stockAlertCount}
        unclosedTicketsCount={unclosedTicketsCount}
      />

      {/* Global Command Palette (Cmd+K / Ctrl+K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigate={setCurrentSection}
        onQuickGenerate={handleOpenQuickGenerate}
        onTriggerClosure={() => setCurrentSection('closure')}
        onPurgeRam={() => {
          if (routers.length > 0) handlePurgeRouter(routers[0].id);
        }}
        tickets={tickets}
      />
    </div>
  );
}
