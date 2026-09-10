'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Wifi,
  ShieldCheck,
  Database,
  Mail,
  Send,
  Router,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  RefreshCw,
  Server,
  Lock,
  Bot,
  Layers,
  HelpCircle,
  Globe,
  Sliders,
  Phone,
  MessageSquare,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function SetupWizardPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [testResult, setTestResult] = useState<{ type: string; success: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [notifSubTab, setNotifSubTab] = useState<'telegram' | 'smtp' | 'discord' | 'slack' | 'whatsapp'>('telegram');

  // Form State initialized with sensible defaults
  const [formData, setFormData] = useState({
    // Step 1: General & Super Admin
    general: {
      appName: 'NetPulse Hotspot Manager',
      currency: 'FCFA',
      timezone: 'Africa/Abidjan',
      lowStockThreshold: 15,
    },
    superAdmin: {
      name: 'Super Administrateur',
      email: '',
      password: '',
    },
    // Step 2: PostgreSQL Database
    database: {
      host: 'localhost',
      port: 5434,
      databaseName: 'netpulse_hotspot_db',
      username: 'netpulse_hotspot',
      password: 'netpulse_hotspot',
    },
    // Step 3: Multi-Channel Alerts
    smtp: {
      host: '',
      port: 587,
      secure: false,
      username: '',
      password: '',
      senderEmail: '',
      senderName: 'NetPulse Hotspot',
      recipients: [] as string[],
    },
    telegram: {
      botToken: '',
      adminChatId: '',
    },
    discord: {
      webhookUrl: '',
    },
    slack: {
      webhookUrl: '',
    },
    whatsapp: {
      accountSid: '',
      authToken: '',
      from: '',
      to: '',
    },
    // Step 4: First MikroTik Router
    router: {
      name: 'Site Central - Agence Principale',
      location: 'Siège Central',
      host: '192.168.88.1',
      apiPort: 8728,
      connectionType: 'socket' as 'socket' | 'rest',
      username: 'admin',
      password: '',
      hotspotDnsName: 'hotspot.wifi',
    },
  });

  // Load live server environment and DB configuration on mount
  useEffect(() => {
    async function loadDetectedConfig() {
      try {
        const res = await fetch('/api/setup/status');
        if (res.ok) {
          const data = await res.json();
          const cfg = data.config;
          if (cfg) {
            setFormData((prev) => ({
              general: {
                appName: cfg.general?.appName || prev.general.appName,
                currency: cfg.general?.currency || prev.general.currency,
                timezone: cfg.general?.timezone || prev.general.timezone,
                lowStockThreshold: cfg.general?.lowStockThreshold || prev.general.lowStockThreshold,
              },
              superAdmin: {
                name: prev.superAdmin.name,
                email: prev.superAdmin.email || 'admin@' + (cfg.general?.appName?.toLowerCase().replace(/\s+/g, '') || 'netpulse') + '.lan',
                password: prev.superAdmin.password,
              },
              database: {
                host: cfg.database?.host || prev.database.host,
                port: Number(cfg.database?.port) || prev.database.port,
                databaseName: cfg.database?.databaseName || prev.database.databaseName,
                username: cfg.database?.username || prev.database.username,
                password: cfg.database?.password || prev.database.password,
              },
              smtp: {
                host: cfg.smtp?.host || prev.smtp.host,
                port: Number(cfg.smtp?.port) || prev.smtp.port,
                secure: cfg.smtp?.secure ?? prev.smtp.secure,
                username: cfg.smtp?.username || prev.smtp.username,
                password: cfg.smtp?.password || prev.smtp.password,
                senderEmail: cfg.smtp?.senderEmail || prev.smtp.senderEmail,
                senderName: cfg.smtp?.senderName || prev.smtp.senderName,
                recipients: cfg.smtp?.recipients || prev.smtp.recipients,
              },
              telegram: {
                botToken: cfg.telegram?.botToken || prev.telegram.botToken,
                adminChatId: cfg.telegram?.adminChatId || prev.telegram.adminChatId,
              },
              discord: {
                webhookUrl: cfg.discord?.webhookUrl || prev.discord.webhookUrl,
              },
              slack: {
                webhookUrl: cfg.slack?.webhookUrl || prev.slack.webhookUrl,
              },
              whatsapp: {
                accountSid: cfg.whatsapp?.accountSid || prev.whatsapp.accountSid,
                authToken: cfg.whatsapp?.authToken || prev.whatsapp.authToken,
                from: cfg.whatsapp?.from || prev.whatsapp.from,
                to: cfg.whatsapp?.to || prev.whatsapp.to,
              },
              router: {
                name: prev.router.name,
                location: prev.router.location,
                host: cfg.mikrotikDefault?.host || prev.router.host,
                apiPort: Number(cfg.mikrotikDefault?.apiPort) || prev.router.apiPort,
                connectionType: cfg.mikrotikDefault?.connectionType || prev.router.connectionType,
                username: cfg.mikrotikDefault?.username || prev.router.username,
                password: cfg.mikrotikDefault?.password || prev.router.password,
                hotspotDnsName: cfg.mikrotikDefault?.hotspotDnsName || prev.router.hotspotDnsName,
              },
            }));
          }
        }
      } catch (err) {
        console.warn('Impossible de charger la configuration serveur auto-détectée', err);
      } finally {
        setIsLoadingInitial(false);
      }
    }
    loadDetectedConfig();
  }, []);

  const steps = [
    { num: 1, title: 'Établissement', desc: 'Identité & Admin', icon: ShieldCheck },
    { num: 2, title: 'Base de Données', desc: 'PostgreSQL Réel', icon: Database },
    { num: 3, title: 'Notifications', desc: 'Multi-Canal (5)', icon: Bot },
    { num: 4, title: 'Routeur MikroTik', desc: 'Socket API RouterOS', icon: Router },
    { num: 5, title: 'Lancement', desc: 'Synthèse & Déploiement', icon: Sparkles },
  ];

  // Test DB connection with real query
  const handleTestDatabase = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/setup/test-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData.database),
      });
      const data = await res.json();
      setTestResult({
        type: 'database',
        success: data.success,
        message: data.message || data.error,
      });
    } catch {
      setTestResult({ type: 'database', success: false, message: 'Erreur réseau lors du test DB' });
    } finally {
      setIsTesting(false);
    }
  };

  // Test generic channel (telegram, smtp, discord, slack, whatsapp)
  const handleTestChannel = async (channel: 'telegram' | 'smtp' | 'discord' | 'slack' | 'whatsapp') => {
    setIsTesting(true);
    setTestResult(null);
    try {
      let payload: any = {};
      if (channel === 'telegram') payload = formData.telegram;
      else if (channel === 'smtp') payload = formData.smtp;
      else if (channel === 'discord') payload = formData.discord;
      else if (channel === 'slack') payload = formData.slack;
      else if (channel === 'whatsapp') payload = formData.whatsapp;

      const res = await fetch(`/api/setup/test-${channel}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setTestResult({
        type: channel,
        success: data.success,
        message: data.message || data.error || (data.success ? `Test ${channel.toUpperCase()} validé.` : 'Échec du test'),
      });
    } catch {
      setTestResult({ type: channel, success: false, message: `Erreur de communication lors du test ${channel}` });
    } finally {
      setIsTesting(false);
    }
  };

  // Test MikroTik connection
  const handleTestMikrotik = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/setup/test-mikrotik', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData.router),
      });
      const data = await res.json();
      setTestResult({
        type: 'router',
        success: data.success,
        message: data.message || data.error,
      });
    } catch {
      setTestResult({ type: 'router', success: false, message: 'Erreur réseau lors du test MikroTik' });
    } finally {
      setIsTesting(false);
    }
  };

  // Submit complete setup
  const handleCompleteSetup = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/setup/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        toast.success('Configuration initiale enregistrée avec succès !');
        router.push('/');
      } else {
        toast.error('Erreur lors de la sauvegarde de la configuration');
      }
    } catch {
      toast.error('Erreur réseau lors de la communication avec le serveur');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-8">
      {/* Top Header */}
      <div className="max-w-4xl mx-auto w-full flex items-center justify-between py-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-500/20">
            <Wifi className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-white tracking-tight flex items-center gap-2">
              <span>{formData.general.appName || 'NetPulse Hotspot Manager'}</span>
              <span className="text-xs px-2 py-0.5 rounded bg-blue-950 text-blue-400 border border-blue-800 font-semibold">
                Setup Wizard v2026
              </span>
            </h1>
            <p className="text-xs text-slate-400">Assistant d&apos;initialisation dynamique de l&apos;infrastructure cloud & MikroTik</p>
          </div>
        </div>

        <Link
          href="/"
          className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg border border-slate-800 hover:border-slate-700 transition"
        >
          Ignorer & Accéder au Dashboard →
        </Link>
      </div>

      {/* Main Wizard Container */}
      <div className="max-w-4xl mx-auto w-full my-8 bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-8">
        {/* Step Indicator */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 border-b border-slate-800 pb-6">
          {steps.map((step) => {
            const isDone = currentStep > step.num;
            const isCurrent = currentStep === step.num;
            return (
              <div
                key={step.num}
                onClick={() => setCurrentStep(step.num)}
                className={`flex items-center gap-2.5 p-2 rounded-xl border transition cursor-pointer ${
                  isCurrent
                    ? 'border-blue-500 bg-blue-950/40 text-blue-400 ring-1 ring-blue-500/50'
                    : isDone
                    ? 'border-emerald-800 bg-emerald-950/20 text-emerald-400'
                    : 'border-slate-800/60 text-slate-500 hover:border-slate-700'
                }`}
              >
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                    isCurrent
                      ? 'bg-blue-600 text-white'
                      : isDone
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {isDone ? '✓' : step.num}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate">{step.title}</div>
                  <div className="text-[10px] text-slate-400 truncate">{step.desc}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Feedback test banner if any */}
        {testResult && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-2.5 ${
              testResult.success
                ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                : 'bg-rose-950/40 border-rose-800 text-rose-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {testResult.success ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              ) : (
                <HelpCircle className="h-4 w-4 text-rose-400 shrink-0" />
              )}
              <span>{testResult.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setTestResult(null)}
              className="text-[10px] opacity-60 hover:opacity-100"
            >
              Fermer
            </button>
          </div>
        )}

        {/* STEP 1: General & Super Admin */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Globe className="h-5 w-5 text-blue-500" />
                <span>Étape 1 : Paramètres de l&apos;Établissement & Compte Super-Administrateur</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Renseignez le nom de votre réseau commercial Hotspot et les accès du compte administrateur maître.
              </p>
            </div>

            {/* General App Settings */}
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-800/40 space-y-3">
              <div className="text-xs font-semibold text-blue-400 flex items-center gap-1.5">
                <Sliders className="h-3.5 w-3.5" />
                <span>Identité du Réseau Hotspot</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Nom de l&apos;Application *</label>
                  <input
                    type="text"
                    required
                    value={formData.general.appName}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        general: { ...formData.general, appName: e.target.value },
                      })
                    }
                    placeholder="Ex: NetPulse Hotspot"
                    className="w-full p-2.5 rounded-lg border border-slate-700 bg-slate-800 text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Devise de Vente *</label>
                  <input
                    type="text"
                    required
                    value={formData.general.currency}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        general: { ...formData.general, currency: e.target.value },
                      })
                    }
                    placeholder="FCFA, EUR, USD, XOF"
                    className="w-full p-2.5 rounded-lg border border-slate-700 bg-slate-800 text-white font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Fuseau Horaire</label>
                  <input
                    type="text"
                    value={formData.general.timezone}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        general: { ...formData.general, timezone: e.target.value },
                      })
                    }
                    placeholder="Africa/Abidjan, Europe/Paris"
                    className="w-full p-2.5 rounded-lg border border-slate-700 bg-slate-800 text-white font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Super Admin Credentials */}
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-800/40 space-y-3">
              <div className="text-xs font-semibold text-blue-400 flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Identifiants Super-Administrateur</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Nom et Prénom *</label>
                  <input
                    type="text"
                    required
                    value={formData.superAdmin.name}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        superAdmin: { ...formData.superAdmin, name: e.target.value },
                      })
                    }
                    placeholder="Super Administrateur"
                    className="w-full p-2.5 rounded-lg border border-slate-700 bg-slate-800 text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Email de Connexion *</label>
                  <input
                    type="email"
                    required
                    value={formData.superAdmin.email}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        superAdmin: { ...formData.superAdmin, email: e.target.value },
                      })
                    }
                    placeholder="admin@netpulse.lan"
                    className="w-full p-2.5 rounded-lg border border-slate-700 bg-slate-800 text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Mot de Passe Sécurisé *</label>
                  <input
                    type="password"
                    required
                    value={formData.superAdmin.password}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        superAdmin: { ...formData.superAdmin, password: e.target.value },
                      })
                    }
                    placeholder="Mot de passe fort"
                    className="w-full p-2.5 rounded-lg border border-slate-700 bg-slate-800 text-white font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Database PostgreSQL */}
        {currentStep === 2 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Database className="h-5 w-5 text-purple-500" />
                  <span>Étape 2 : Configuration de la Base de Données PostgreSQL</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Persistance externe avec Drizzle ORM garantissant le découplage total de la mémoire MikroTik.
                </p>
              </div>

              <button
                type="button"
                onClick={handleTestDatabase}
                disabled={isTesting}
                className="px-3 py-1.5 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 border border-purple-500/50 text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                <span>Tester Connexion Active</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-2">
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-300 mb-1">Hôte PostgreSQL *</label>
                <input
                  type="text"
                  required
                  value={formData.database.host}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      database: { ...formData.database, host: e.target.value },
                    })
                  }
                  placeholder="localhost"
                  className="w-full p-2.5 rounded-lg border border-slate-800 bg-slate-800 text-white font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Port</label>
                <input
                  type="number"
                  value={formData.database.port}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      database: { ...formData.database, port: Number(e.target.value) },
                    })
                  }
                  placeholder="5434"
                  className="w-full p-2.5 rounded-lg border border-slate-800 bg-slate-800 text-white font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Nom de la Base *</label>
                <input
                  type="text"
                  required
                  value={formData.database.databaseName}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      database: { ...formData.database, databaseName: e.target.value },
                    })
                  }
                  placeholder="netpulse_hotspot_db"
                  className="w-full p-2.5 rounded-lg border border-slate-800 bg-slate-800 text-white font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Utilisateur *</label>
                <input
                  type="text"
                  required
                  value={formData.database.username}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      database: { ...formData.database, username: e.target.value },
                    })
                  }
                  placeholder="netpulse_hotspot"
                  className="w-full p-2.5 rounded-lg border border-slate-800 bg-slate-800 text-white font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Mot de Passe</label>
                <input
                  type="password"
                  value={formData.database.password}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      database: { ...formData.database, password: e.target.value },
                    })
                  }
                  placeholder="••••••••"
                  className="w-full p-2.5 rounded-lg border border-slate-800 bg-slate-800 text-white font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Multi-Channel Alerts */}
        {currentStep === 3 && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Bot className="h-5 w-5 text-blue-500" />
                  <span>Étape 3 : Hub de Notifications Multi-Canal</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Configurez vos passerelles de diffusion instantanée (Telegram, SMTP, Discord, Slack, WhatsApp).
                </p>
              </div>
            </div>

            {/* Sub-Tabs for Channels */}
            <div className="flex flex-wrap gap-1.5 border-b border-slate-800 pb-3">
              {[
                { id: 'telegram', label: '✈️ Telegram Bot' },
                { id: 'smtp', label: '✉️ Email SMTP' },
                { id: 'discord', label: '🎮 Discord Webhook' },
                { id: 'slack', label: '💬 Slack Webhook' },
                { id: 'whatsapp', label: '📱 WhatsApp (Twilio)' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setNotifSubTab(tab.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    notifSubTab === tab.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab: Telegram */}
            {notifSubTab === 'telegram' && (
              <div className="rounded-xl border border-slate-800 p-4 bg-slate-800/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-blue-400">Paramètres Bot Telegram</span>
                  <button
                    type="button"
                    onClick={() => handleTestChannel('telegram')}
                    disabled={isTesting}
                    className="px-2.5 py-1 rounded bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 text-xs font-semibold flex items-center gap-1"
                  >
                    <RefreshCw className={`h-3 w-3 ${isTesting ? 'animate-spin' : ''}`} />
                    <span>Tester Message Telegram</span>
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">Bot Token API</label>
                    <input
                      type="text"
                      placeholder="123456789:ABCdef..."
                      value={formData.telegram.botToken}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          telegram: { ...formData.telegram, botToken: e.target.value },
                        })
                      }
                      className="w-full p-2.5 rounded-lg border border-slate-700 bg-slate-800 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">Admin Chat ID / Groupe</label>
                    <input
                      type="text"
                      placeholder="@netpulse_direction ou ID -100..."
                      value={formData.telegram.adminChatId}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          telegram: { ...formData.telegram, adminChatId: e.target.value },
                        })
                      }
                      className="w-full p-2.5 rounded-lg border border-slate-700 bg-slate-800 text-white font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Tab: SMTP */}
            {notifSubTab === 'smtp' && (
              <div className="rounded-xl border border-slate-800 p-4 bg-slate-800/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-blue-400">Passerelle Email SMTP Certifiée</span>
                  <button
                    type="button"
                    onClick={() => handleTestChannel('smtp')}
                    disabled={isTesting}
                    className="px-2.5 py-1 rounded bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 text-xs font-semibold flex items-center gap-1"
                  >
                    <RefreshCw className={`h-3 w-3 ${isTesting ? 'animate-spin' : ''}`} />
                    <span>Tester Envoi SMTP</span>
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="sm:col-span-2">
                    <label className="block font-medium text-slate-300 mb-1">Hôte Serveur SMTP</label>
                    <input
                      type="text"
                      placeholder="smtp.gmail.com"
                      value={formData.smtp.host}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          smtp: { ...formData.smtp, host: e.target.value },
                        })
                      }
                      className="w-full p-2 rounded-lg border border-slate-700 bg-slate-800 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">Port</label>
                    <input
                      type="number"
                      placeholder="587"
                      value={formData.smtp.port}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          smtp: { ...formData.smtp, port: Number(e.target.value) },
                        })
                      }
                      className="w-full p-2 rounded-lg border border-slate-700 bg-slate-800 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">Email Expéditeur</label>
                    <input
                      type="email"
                      placeholder="alerts@netpulse.lan"
                      value={formData.smtp.senderEmail}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          smtp: { ...formData.smtp, senderEmail: e.target.value },
                        })
                      }
                      className="w-full p-2 rounded-lg border border-slate-700 bg-slate-800 text-white"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">Utilisateur SMTP</label>
                    <input
                      type="text"
                      value={formData.smtp.username}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          smtp: { ...formData.smtp, username: e.target.value },
                        })
                      }
                      className="w-full p-2 rounded-lg border border-slate-700 bg-slate-800 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">Mot de Passe SMTP</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={formData.smtp.password}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          smtp: { ...formData.smtp, password: e.target.value },
                        })
                      }
                      className="w-full p-2 rounded-lg border border-slate-700 bg-slate-800 text-white font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Discord */}
            {notifSubTab === 'discord' && (
              <div className="rounded-xl border border-slate-800 p-4 bg-slate-800/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-indigo-400">Canal Webhook Discord</span>
                  <button
                    type="button"
                    onClick={() => handleTestChannel('discord')}
                    disabled={isTesting}
                    className="px-2.5 py-1 rounded bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 text-xs font-semibold flex items-center gap-1"
                  >
                    <RefreshCw className={`h-3 w-3 ${isTesting ? 'animate-spin' : ''}`} />
                    <span>Tester Discord Webhook</span>
                  </button>
                </div>
                <div className="text-xs">
                  <label className="block font-medium text-slate-300 mb-1">URL Webhook Discord</label>
                  <input
                    type="text"
                    placeholder="https://discord.com/api/webhooks/..."
                    value={formData.discord.webhookUrl}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        discord: { ...formData.discord, webhookUrl: e.target.value },
                      })
                    }
                    className="w-full p-2.5 rounded-lg border border-slate-700 bg-slate-800 text-white font-mono"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Diffuse les clôtures de caisse et alertes de santé routeur sous forme d&apos;embeds Discord riches.
                  </p>
                </div>
              </div>
            )}

            {/* Tab: Slack */}
            {notifSubTab === 'slack' && (
              <div className="rounded-xl border border-slate-800 p-4 bg-slate-800/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-emerald-400">Canal Incoming Webhook Slack</span>
                  <button
                    type="button"
                    onClick={() => handleTestChannel('slack')}
                    disabled={isTesting}
                    className="px-2.5 py-1 rounded bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 text-xs font-semibold flex items-center gap-1"
                  >
                    <RefreshCw className={`h-3 w-3 ${isTesting ? 'animate-spin' : ''}`} />
                    <span>Tester Slack Webhook</span>
                  </button>
                </div>
                <div className="text-xs">
                  <label className="block font-medium text-slate-300 mb-1">URL Incoming Webhook Slack</label>
                  <input
                    type="text"
                    placeholder="https://hooks.slack.com/services/..."
                    value={formData.slack.webhookUrl}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        slack: { ...formData.slack, webhookUrl: e.target.value },
                      })
                    }
                    className="w-full p-2.5 rounded-lg border border-slate-700 bg-slate-800 text-white font-mono"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Génère des synthèses visuelles au format Block Kit pour vos canaux d&apos;exploitation.
                  </p>
                </div>
              </div>
            )}

            {/* Tab: WhatsApp */}
            {notifSubTab === 'whatsapp' && (
              <div className="rounded-xl border border-slate-800 p-4 bg-slate-800/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-green-400">Passerelle WhatsApp (Twilio REST API)</span>
                  <button
                    type="button"
                    onClick={() => handleTestChannel('whatsapp')}
                    disabled={isTesting}
                    className="px-2.5 py-1 rounded bg-green-600/30 hover:bg-green-600/50 text-green-300 text-xs font-semibold flex items-center gap-1"
                  >
                    <RefreshCw className={`h-3 w-3 ${isTesting ? 'animate-spin' : ''}`} />
                    <span>Tester WhatsApp</span>
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">Account SID</label>
                    <input
                      type="text"
                      placeholder="ACxxxxxxxx..."
                      value={formData.whatsapp.accountSid}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          whatsapp: { ...formData.whatsapp, accountSid: e.target.value },
                        })
                      }
                      className="w-full p-2 rounded-lg border border-slate-700 bg-slate-800 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">Auth Token</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={formData.whatsapp.authToken}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          whatsapp: { ...formData.whatsapp, authToken: e.target.value },
                        })
                      }
                      className="w-full p-2 rounded-lg border border-slate-700 bg-slate-800 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">Numéro Destinataire</label>
                    <input
                      type="text"
                      placeholder="+22890123456"
                      value={formData.whatsapp.to}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          whatsapp: { ...formData.whatsapp, to: e.target.value },
                        })
                      }
                      className="w-full p-2 rounded-lg border border-slate-700 bg-slate-800 text-white font-mono"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 4: First MikroTik Router */}
        {currentStep === 4 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Router className="h-5 w-5 text-emerald-500" />
                  <span>Étape 4 : Connexion au Premier Routeur MikroTik</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Synchronisation socket API native (port 8728) ou REST API via @fibercom/routeros-api.
                </p>
              </div>

              <button
                type="button"
                onClick={handleTestMikrotik}
                disabled={isTesting}
                className="px-3 py-1.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/50 text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                <span>Tester Socket API</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Nom du Site *</label>
                <input
                  type="text"
                  required
                  value={formData.router.name}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      router: { ...formData.router, name: e.target.value },
                    })
                  }
                  className="w-full p-2.5 rounded-lg border border-slate-800 bg-slate-800 text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Adresse IP / Hôte *</label>
                <input
                  type="text"
                  required
                  value={formData.router.host}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      router: { ...formData.router, host: e.target.value },
                    })
                  }
                  className="w-full p-2.5 rounded-lg border border-slate-800 bg-slate-800 text-white font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Protocole de Connexion</label>
                <select
                  value={formData.router.connectionType}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      router: { ...formData.router, connectionType: e.target.value as any },
                    })
                  }
                  className="w-full p-2.5 rounded-lg border border-slate-800 bg-slate-800 text-white"
                >
                  <option value="socket">Socket API Native (Port 8728 - Recommandé)</option>
                  <option value="rest">REST API HTTPS (Port 443 / RouterOS v7.1+)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Port API</label>
                <input
                  type="number"
                  value={formData.router.apiPort}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      router: { ...formData.router, apiPort: Number(e.target.value) },
                    })
                  }
                  className="w-full p-2.5 rounded-lg border border-slate-800 bg-slate-800 text-white font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Utilisateur RouterOS API *</label>
                <input
                  type="text"
                  required
                  value={formData.router.username}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      router: { ...formData.router, username: e.target.value },
                    })
                  }
                  className="w-full p-2.5 rounded-lg border border-slate-800 bg-slate-800 text-white font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Mot de Passe RouterOS</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={formData.router.password}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      router: { ...formData.router, password: e.target.value },
                    })
                  }
                  className="w-full p-2.5 rounded-lg border border-slate-800 bg-slate-800 text-white font-mono"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-300 mb-1">
                  Nom de Domaine Hotspot (pour le QR Code automatique)
                </label>
                <input
                  type="text"
                  placeholder="hotspot.wifi"
                  value={formData.router.hotspotDnsName}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      router: { ...formData.router, hotspotDnsName: e.target.value },
                    })
                  }
                  className="w-full p-2.5 rounded-lg border border-slate-800 bg-slate-800 text-white font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: Final Review & Launch */}
        {currentStep === 5 && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div className="text-center space-y-2">
              <div className="inline-flex p-3 rounded-2xl bg-blue-600/20 border border-blue-500/40 text-blue-400">
                <Sparkles className="h-8 w-8" />
              </div>
              <h2 className="text-xl font-bold text-white">Prêt pour le Déploiement en Production!</h2>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Toutes les couches architecturales sont configurées avec des paramètres dynamiques : Découplage de la base de données, Throttling MikroTik actif (&lt; 15% CPU), Hub multi-canal prêt.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl border border-slate-800 bg-slate-800/40 space-y-1">
                <div className="text-slate-400 font-semibold">Établissement</div>
                <div className="font-bold text-white truncate">{formData.general.appName}</div>
                <div className="text-[11px] text-slate-400 truncate">Devise: {formData.general.currency}</div>
              </div>

              <div className="p-3 rounded-xl border border-slate-800 bg-slate-800/40 space-y-1">
                <div className="text-slate-400 font-semibold">Super-Admin</div>
                <div className="font-bold text-white truncate">{formData.superAdmin.name}</div>
                <div className="text-[11px] text-slate-400 truncate">{formData.superAdmin.email}</div>
              </div>

              <div className="p-3 rounded-xl border border-slate-800 bg-slate-800/40 space-y-1">
                <div className="text-slate-400 font-semibold">PostgreSQL</div>
                <div className="font-bold text-white truncate">{formData.database.databaseName}</div>
                <div className="text-[11px] text-slate-400 truncate">{formData.database.host}:{formData.database.port}</div>
              </div>

              <div className="p-3 rounded-xl border border-slate-800 bg-slate-800/40 space-y-1">
                <div className="text-slate-400 font-semibold">Routeur MikroTik</div>
                <div className="font-bold text-white truncate">{formData.router.name}</div>
                <div className="text-[11px] text-slate-400 truncate">{formData.router.host} ({formData.router.connectionType})</div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-6 border-t border-slate-800">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={() => setCurrentStep(currentStep - 1)}
              className="px-4 py-2 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Précédent</span>
            </button>
          ) : (
            <div />
          )}

          {currentStep < 5 ? (
            <button
              type="button"
              onClick={() => setCurrentStep(currentStep + 1)}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-blue-600/30 transition"
            >
              <span>Continuer</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCompleteSetup}
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Enregistrement...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Finaliser & Ouvrir le Dashboard NetPulse</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-4xl mx-auto w-full text-center text-xs text-slate-500 py-4">
        NetPulse Hotspot Manager v2026 • Découplage de l&apos;intelligence commerciale pour MikroTik RouterBOARD
      </div>
    </div>
  );
}
