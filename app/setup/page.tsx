'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Wifi,
    ShieldCheck,
    Database,
    Router,
    CheckCircle2,
    Send,
    ArrowRight,
    ArrowLeft,
    Sparkles,
    RefreshCw,
    Bot,
    Mail,
    Copy,
    Check,
    Eye,
    EyeOff,
    HelpCircle,
    Globe,
    Sliders
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { signIn } from '@/lib/auth-client';

export default function SetupWizardPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [testResult, setTestResult] = useState<{ type: string; success: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [notifSubTab, setNotifSubTab] = useState<'telegram' | 'smtp' | 'discord' | 'ai'>('telegram');
  const [envCopied, setEnvCopied] = useState(false);
  const [showEnv, setShowEnv] = useState(false);

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
      provider: 'self-hosted',
      connectionUrl: '',
      host: 'localhost',
      port: 5434,
      databaseName: 'netpulse_hotspot_db',
      username: 'netpulse_hotspot',
      password: 'netpulse_hotspot',
    },
    // Step 3: Multi-Channel Alerts
    smtp: {
      provider: 'smtp' as 'smtp' | 'resend',
      resendApiKey: '',
      host: '',
      port: 587,
      secure: false,
      username: '',
      password: '',
      senderEmail: '',
      senderName: 'NetPulse Hotspot',
      recipients: [] as string[],
      resendTestRecipient: 'mytestmail.dev007@gmail.com',
    },
    telegram: {
      botToken: '',
      adminChatId: '',
      targetType: 'private' as 'private' | 'group' | 'channel',
    },
    discord: {
      botToken: '',
      channelId: '',
    },
    ai: {
      provider: 'gemini',
      apiKey: '',
    },
    // Step 4: First MikroTik Router (Optionnel)
    router: {
      name: 'Site Central - Agence Principale',
      location: 'Siège Central',
      host: '',
      apiPort: 8728,
      connectionType: 'socket' as 'socket' | 'rest',
      username: 'admin',
      password: '',
      hotspotDnsName: 'hotspot.wifi',
    },
  });
  const [additionalRouters, setAdditionalRouters] = useState<Array<{
    name: string;
    location: string;
    host: string;
    apiPort: number;
    connectionType: 'socket' | 'rest';
    username: string;
    password: string;
    hotspotDnsName: string;
  }>>([]);

  const quoteEnv = (value: string | number | boolean) => {
    const normalized = String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
    return `"${normalized}"`;
  };

  const envExport = [
    '# NetPulse Hotspot Manager - configuration locale',
    '# Copiez ce bloc dans votre gestionnaire de secrets ou .env.local.',
    `NEXT_PUBLIC_APP_NAME=${quoteEnv(formData.general.appName)}`,
    `DEFAULT_CURRENCY=${quoteEnv(formData.general.currency)}`,
    `DEFAULT_TIMEZONE=${quoteEnv(formData.general.timezone)}`,
    `LOW_STOCK_THRESHOLD=${formData.general.lowStockThreshold}`,
    `DATABASE_URL=${quoteEnv(formData.database.connectionUrl)}`,
    `POSTGRES_HOST=${quoteEnv(formData.database.host)}`,
    `POSTGRES_PORT=${formData.database.port}`,
    `POSTGRES_USER=${quoteEnv(formData.database.username)}`,
    `POSTGRES_PASSWORD=${quoteEnv(formData.database.password)}`,
    `POSTGRES_DB=${quoteEnv(formData.database.databaseName)}`,
    `TELEGRAM_BOT_TOKEN=${quoteEnv(formData.telegram.botToken)}`,
    `TELEGRAM_CHAT_ID=${quoteEnv(formData.telegram.adminChatId)}`,
    `DISCORD_BOT_TOKEN=${quoteEnv(formData.discord.botToken)}`,
    `DISCORD_CHANNEL_ID=${quoteEnv(formData.discord.channelId)}`,
    `RESEND_API_KEY=${quoteEnv(formData.smtp.resendApiKey)}`,
    `GEMINI_API_KEY=${quoteEnv(formData.ai.apiKey)}`,
    `SMTP_HOST=${quoteEnv(formData.smtp.host)}`,
    `SMTP_PORT=${formData.smtp.port}`,
    `SMTP_USER=${quoteEnv(formData.smtp.username)}`,
    `SMTP_PASS=${quoteEnv(formData.smtp.password)}`,
    `SMTP_FROM=${quoteEnv(formData.smtp.senderEmail)}`,
    `NOTIFICATION_EMAILS=${quoteEnv(formData.smtp.recipients.join(', '))}`,
  ].join('\n');

  const copyEnv = async () => {
    await navigator.clipboard.writeText(envExport);
    setEnvCopied(true);
    setTimeout(() => setEnvCopied(false), 2200);
  };

  const maskedEnvExport = envExport.replace(/[^\n]/g, '•');

  const updateAdditionalRouter = (index: number, patch: Partial<typeof additionalRouters[number]>) => {
    setAdditionalRouters((routers) => routers.map((router, routerIndex) =>
      routerIndex === index ? { ...router, ...patch } : router
    ));
  };

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
                provider: cfg.database?.provider || prev.database.provider,
                connectionUrl: '',
                host: cfg.database?.host || prev.database.host,
                port: Number(cfg.database?.port) || prev.database.port,
                databaseName: cfg.database?.databaseName || prev.database.databaseName,
                username: cfg.database?.username || prev.database.username,
                password: cfg.database?.password || prev.database.password,
              },
              smtp: {
                provider: cfg.smtp?.provider || prev.smtp.provider,
                resendApiKey: '',
                host: cfg.smtp?.host || prev.smtp.host,
                port: Number(cfg.smtp?.port) || prev.smtp.port,
                secure: cfg.smtp?.secure ?? prev.smtp.secure,
                username: cfg.smtp?.username || prev.smtp.username,
                password: cfg.smtp?.password || prev.smtp.password,
                senderEmail: cfg.smtp?.senderEmail || prev.smtp.senderEmail,
                senderName: cfg.smtp?.senderName || prev.smtp.senderName,
                recipients: cfg.smtp?.recipients || prev.smtp.recipients,
                resendTestRecipient: cfg.smtp?.resendTestRecipient || prev.smtp.resendTestRecipient,
              },
              telegram: {
                botToken: cfg.telegram?.botToken || prev.telegram.botToken,
                adminChatId: cfg.telegram?.adminChatId || prev.telegram.adminChatId,
                targetType: cfg.telegram?.targetType || prev.telegram.targetType,
              },
              discord: {
                botToken: cfg.discord?.botToken || prev.discord.botToken,
                channelId: cfg.discord?.channelId || prev.discord.channelId,
              },
              ai: prev.ai,
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
    { num: 3, title: 'Notifications & IA', desc: 'Telegram, Email, Discord, Gemini', icon: Bot },
    { num: 4, title: 'Routeurs MikroTik', desc: 'Un ou plusieurs sites', icon: Router },
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
        message: data.message || data.error || 'Échec du test de la base de données.',
      });
    } catch {
      setTestResult({ type: 'database', success: false, message: 'Erreur réseau lors du test DB' });
    } finally {
      setIsTesting(false);
    }
  };

  // Test the configured notification channel.
  const handleTestChannel = async (channel: 'telegram' | 'smtp' | 'discord') => {
    setIsTesting(true);
    setTestResult(null);
    try {
      let payload: any = {};
      if (channel === 'telegram') payload = formData.telegram;
      else if (channel === 'smtp') payload = formData.smtp;
      else if (channel === 'discord') payload = formData.discord;

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
        body: JSON.stringify({ ...formData, routers: [formData.router, ...additionalRouters] }),
      });
      if (res.ok) {
        toast.success('Configuration enregistrée avec succès dans la base et le fichier .env !');

        // Auto-login super admin if credentials provided
        if (formData.superAdmin.email && formData.superAdmin.password) {
          try {
            await signIn.email({
              email: formData.superAdmin.email.trim().toLowerCase(),
              password: formData.superAdmin.password,
            });
            window.location.href = '/';
            return;
          } catch {
            // fallback to login
          }
        }
        window.location.href = '/login';
      } else {
        const data = await res.json();
        toast.error(
          data.message ||
          (data.error === 'UNAUTHORIZED'
            ? 'Configuration déjà initialisée : connectez-vous comme administrateur et utilisez la page Settings.'
            : data.error) ||
          'Erreur lors de la sauvegarde de la configuration'
        );
      }
    } catch {
      toast.error('Erreur réseau lors de la communication avec le serveur');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="setup-page app-shell min-h-screen bg-background text-foreground flex flex-col justify-between p-3 sm:p-6 lg:p-8">
      {/* Top Header */}
      <div className="max-w-4xl mx-auto w-full flex items-center justify-between gap-3 py-4 border-b border-border">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-500/20">
            <Wifi className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-lg text-white tracking-tight flex items-center gap-2 min-w-0">
              <span className="truncate">{formData.general.appName || 'NetPulse Hotspot Manager'}</span>
              <span className="hidden sm:inline text-xs px-2 py-0.5 rounded bg-blue-950 text-blue-400 border border-blue-800 font-semibold shrink-0">
                Setup Wizard v2026
              </span>
            </h1>
            <p className="text-xs text-slate-400 truncate">Assistant d&apos;initialisation dynamique de l&apos;infrastructure cloud &amp; MikroTik</p>
          </div>
        </div>

        <Link
          href="/"
          className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg border border-slate-800 hover:border-slate-700 transition"
        >
          <span className="hidden sm:inline">Ignorer &amp; Accéder au Dashboard </span>→
        </Link>
      </div>

      {/* Main Wizard Container */}
      <div className="app-surface max-w-4xl mx-auto w-full my-5 sm:my-8 rounded-2xl p-4 sm:p-6 lg:p-8 shadow-2xl space-y-6 sm:space-y-8">
        {/* Step Indicator */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 border-b border-border pb-5 sm:pb-6">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { id: 'neon', title: 'Neon', description: 'PostgreSQL serverless', href: 'https://neon.tech' },
                { id: 'supabase', title: 'Supabase', description: 'PostgreSQL + services', href: 'https://supabase.com' },
                { id: 'managed', title: 'PostgreSQL managé', description: 'Cloud provider compatible', href: 'https://www.postgresql.org' },
                { id: 'self-hosted', title: 'Self-hosted', description: 'Docker ou serveur local', href: 'https://www.postgresql.org/download/' },
              ].map((provider) => (
                <button
                  key={provider.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, database: { ...formData.database, provider: provider.id } })}
                  className={`rounded-xl border p-3 text-left transition ${
                    formData.database.provider === provider.id
                      ? 'border-purple-400 bg-purple-500/15 ring-1 ring-purple-400/40'
                      : 'border-slate-800 bg-slate-800/40 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-xs text-white">{provider.title}</span>
                    <a href={provider.href} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()} className="text-[10px] text-purple-300 hover:text-white">Voir</a>
                  </div>
                  <span className="mt-1 block text-[11px] text-slate-400">{provider.description}</span>
                </button>
              ))}
            </div>

            <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-3 text-xs text-purple-100">
              Collez l&apos;URL PostgreSQL fournie par votre hébergeur. Elle doit rester secrète et ne sera jamais affichée après enregistrement.
              En production, fournissez-la via un gestionnaire de secrets ou <code className="font-mono">DATABASE_URL</code>.
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-2">
              <div className="sm:col-span-3">
                <label className="block font-semibold text-slate-300 mb-1">URL de connexion PostgreSQL (recommandé)</label>
                <input
                  type="password"
                  value={formData.database.connectionUrl}
                  onChange={(e) => setFormData({ ...formData, database: { ...formData.database, connectionUrl: e.target.value } })}
                  placeholder="postgresql://utilisateur:mot-de-passe@hote/db?sslmode=require"
                  autoComplete="new-password"
                  className="w-full p-2.5 rounded-lg border border-slate-800 bg-slate-800 text-white font-mono"
                />
              </div>
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
                  Configurez vos passerelles de diffusion instantanée (Telegram, SMTP et Discord HTTP).
                </p>
              </div>
            </div>

            {/* Sub-Tabs for Channels */}
            <div className="flex flex-wrap gap-1.5 border-b border-slate-800 pb-3">
              {[
                { id: 'telegram', label: 'Telegram Bot', icon: Send },
                { id: 'smtp', label: 'Email SMTP', icon: Mail },
                { id: 'discord', label: 'Discord HTTP Bot', icon: Globe },
                { id: 'ai', label: 'Assistant IA', icon: Sparkles },
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
                  <span className="inline-flex items-center gap-1.5"><tab.icon className="h-3.5 w-3.5" />{tab.label}</span>
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
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">Type de destination</label>
                    <select
                      value={formData.telegram.targetType}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          telegram: {
                            ...formData.telegram,
                            targetType: e.target.value as 'private' | 'group' | 'channel',
                          },
                        })
                      }
                      className="w-full p-2.5 rounded-lg border border-slate-700 bg-slate-800 text-white"
                    >
                      <option value="private">Discussion privée</option>
                      <option value="group">Groupe ou super-groupe</option>
                      <option value="channel">Canal</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2 rounded-lg border border-blue-500/20 bg-blue-500/10 p-3 text-[11px] text-blue-200 space-y-1">
                    <p className="font-semibold">Aide Telegram</p>
                    <p>Privé : envoyez d&apos;abord /start au bot, puis utilisez votre ID numérique. Groupe/canal : ajoutez le bot, donnez-lui le droit d&apos;envoyer des messages, puis utilisez l&apos;ID -100... ou @nom_public.</p>
                    <p>Le test vérifie le chat avec Telegram avant d&apos;envoyer le message.</p>
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
                <div className="grid grid-cols-2 gap-2">
                  {(['resend', 'smtp'] as const).map((provider) => (
                    <button
                      key={provider}
                      type="button"
                      onClick={() => setFormData({ ...formData, smtp: { ...formData.smtp, provider } })}
                      className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${formData.smtp.provider === provider ? 'border-blue-400 bg-blue-500/15 text-blue-200' : 'border-slate-700 text-slate-400 hover:border-slate-500'}`}
                    >
                      {provider === 'resend' ? 'Resend API' : 'Serveur SMTP'}
                    </button>
                  ))}
                </div>
                {formData.smtp.provider === 'resend' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium text-slate-300 mb-1">Clé API Resend</label>
                      <input
                        type="password"
                        value={formData.smtp.resendApiKey}
                        onChange={(e) => setFormData({ ...formData, smtp: { ...formData.smtp, resendApiKey: e.target.value } })}
                        placeholder="re_..."
                        autoComplete="new-password"
                        className="w-full p-2 rounded-lg border border-slate-700 bg-slate-800 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-slate-300 mb-1">Destinataire du test Resend</label>
                      <input
                        type="email"
                        value={formData.smtp.resendTestRecipient}
                        onChange={(e) => setFormData({ ...formData, smtp: { ...formData.smtp, resendTestRecipient: e.target.value } })}
                        placeholder="mytestmail.dev007@gmail.com"
                        className="w-full p-2 rounded-lg border border-slate-700 bg-slate-800 text-white"
                      />
                      <p className="mt-1 text-[10px] text-amber-300">En mode test Resend, cette adresse doit être celle autorisée par Resend.</p>
                    </div>
                  </div>
                )}
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
                  <span className="font-semibold text-xs text-indigo-400">Canal Discord HTTP Bot</span>
                  <button
                    type="button"
                    onClick={() => handleTestChannel('discord')}
                    disabled={isTesting}
                    className="px-2.5 py-1 rounded bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 text-xs font-semibold flex items-center gap-1"
                  >
                    <RefreshCw className={`h-3 w-3 ${isTesting ? 'animate-spin' : ''}`} />
                    <span>Tester Discord HTTP</span>
                  </button>
                </div>
                <div className="text-xs">
                  <label className="block font-medium text-slate-300 mb-1">Bot Token Discord</label>
                  <input
                    type="password"
                    placeholder="MT..."
                    value={formData.discord.botToken}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        discord: { ...formData.discord, botToken: e.target.value },
                      })
                    }
                    className="w-full p-2.5 rounded-lg border border-slate-700 bg-slate-800 text-white font-mono"
                  />
                  <label className="block font-medium text-slate-300 mt-3 mb-1">ID du salon Discord</label>
                  <input
                    type="text"
                    placeholder="123456789012345678"
                    value={formData.discord.channelId}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        discord: { ...formData.discord, channelId: e.target.value },
                      })
                    }
                    className="w-full p-2.5 rounded-lg border border-slate-700 bg-slate-800 text-white font-mono"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Utilise l&apos;API HTTP officielle Discord pour publier des embeds dans un salon ciblé.
                  </p>
                </div>
              </div>
            )}

            {notifSubTab === 'ai' && (
            <div className="rounded-xl border border-fuchsia-500/30 bg-fuchsia-500/10 p-4 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-fuchsia-300"><Sparkles className="h-4 w-4" /> Assistant IA Gemini</div>
                  <p className="mt-1 text-[11px] text-slate-400">Active l&apos;assistant réseau. La clé est envoyée uniquement au serveur et n&apos;est jamais affichée après sauvegarde.</p>
                </div>
                <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="shrink-0 text-[10px] text-fuchsia-300 hover:text-white">Obtenir une clé</a>
              </div>
              <input
                type="password"
                value={formData.ai.apiKey}
                onChange={(e) => setFormData({ ...formData, ai: { ...formData.ai, apiKey: e.target.value } })}
                placeholder="AIza..."
                autoComplete="new-password"
                className="w-full p-2.5 rounded-lg border border-slate-700 bg-slate-800 text-white font-mono text-xs"
              />
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
                  <span>Étape 4 : Premier Routeur MikroTik (Optionnel)</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Renseignez votre routeur maintenant ou passez cette étape pour l&apos;ajouter ultérieurement depuis le tableau de bord.
                </p>
              </div>

              <button
                type="button"
                onClick={handleTestMikrotik}
                disabled={isTesting || !formData.router.host}
                className="px-3 py-1.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/50 text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                <span>Tester Socket API</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Nom du Site</label>
                <input
                  type="text"
                  placeholder="ex: Siège Central"
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
                <label className="block font-semibold text-slate-300 mb-1">Adresse IP / Hôte (Laisser vide si aucun)</label>
                <input
                  type="text"
                  placeholder="ex: 192.168.88.1"
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
                <label className="block font-semibold text-slate-300 mb-1">Utilisateur RouterOS API</label>
                <input
                  type="text"
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
            <div className="rounded-xl border border-slate-800 bg-slate-800/40 p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300"><Router className="h-4 w-4" /> Ajouter d&apos;autres sites</div>
                  <p className="mt-1 text-[11px] text-slate-400">Le premier routeur est affiché ci-dessus. Ajoutez autant de routeurs que nécessaire avant le lancement.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setAdditionalRouters((routers) => [...routers, { ...formData.router, name: `Site ${routers.length + 2}`, host: '' }])}
                  className="rounded-lg bg-emerald-600/25 px-3 py-2 text-xs font-semibold text-emerald-200 hover:bg-emerald-600/40"
                >
                  + Ajouter un routeur
                </button>
              </div>
              {additionalRouters.map((router, index) => (
                <div key={index} className="rounded-xl border border-slate-700 bg-slate-900/40 p-3 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-emerald-200">Site MikroTik {index + 2}</span>
                    <button type="button" onClick={() => setAdditionalRouters((items) => items.filter((_, itemIndex) => itemIndex !== index))} className="rounded-lg border border-rose-800 px-2 py-1 text-[11px] text-rose-300 hover:bg-rose-950/40">Retirer</button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                    <input type="text" value={router.name} placeholder="Nom du site" onChange={(e) => updateAdditionalRouter(index, { name: e.target.value })} className="rounded-lg border border-slate-700 bg-slate-800 p-2 text-xs text-white" />
                    <input type="text" value={router.location} placeholder="Localisation" onChange={(e) => updateAdditionalRouter(index, { location: e.target.value })} className="rounded-lg border border-slate-700 bg-slate-800 p-2 text-xs text-white" />
                    <input type="text" value={router.host} placeholder="Adresse IP / hôte" onChange={(e) => updateAdditionalRouter(index, { host: e.target.value })} className="rounded-lg border border-slate-700 bg-slate-800 p-2 text-xs text-white font-mono" />
                    <input type="number" value={router.apiPort} placeholder="Port API" onChange={(e) => updateAdditionalRouter(index, { apiPort: Number(e.target.value) })} className="rounded-lg border border-slate-700 bg-slate-800 p-2 text-xs text-white font-mono" />
                    <select value={router.connectionType} onChange={(e) => updateAdditionalRouter(index, { connectionType: e.target.value as 'socket' | 'rest' })} className="rounded-lg border border-slate-700 bg-slate-800 p-2 text-xs text-white">
                      <option value="socket">Socket API</option><option value="rest">REST HTTPS</option>
                    </select>
                    <input type="text" value={router.username} placeholder="Utilisateur RouterOS" onChange={(e) => updateAdditionalRouter(index, { username: e.target.value })} className="rounded-lg border border-slate-700 bg-slate-800 p-2 text-xs text-white font-mono" />
                    <input type="password" value={router.password} placeholder="Mot de passe" autoComplete="new-password" onChange={(e) => updateAdditionalRouter(index, { password: e.target.value })} className="rounded-lg border border-slate-700 bg-slate-800 p-2 text-xs text-white font-mono" />
                    <input type="text" value={router.hotspotDnsName} placeholder="hotspot.wifi" onChange={(e) => updateAdditionalRouter(index, { hotspotDnsName: e.target.value })} className="rounded-lg border border-slate-700 bg-slate-800 p-2 text-xs text-white font-mono" />
                  </div>
                </div>
              ))}
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

            {/* Production secret handling notice */}
            <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 shrink-0 mt-0.5">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="space-y-1 text-xs">
                <div className="font-semibold text-amber-200">Sécurité des secrets en production</div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Les secrets ne sont pas écrits automatiquement dans <code className="px-1.5 py-0.5 rounded bg-black/40 text-amber-200 font-mono">.env</code>. En production, utilisez le gestionnaire de secrets de votre hébergeur ou injectez <code className="px-1.5 py-0.5 rounded bg-black/40 text-amber-200 font-mono">DATABASE_URL</code>, <code className="px-1.5 py-0.5 rounded bg-black/40 text-amber-200 font-mono">RESEND_API_KEY</code> et <code className="px-1.5 py-0.5 rounded bg-black/40 text-amber-200 font-mono">GEMINI_API_KEY</code> avant le démarrage. L&apos;écriture locale n&apos;est autorisée qu&apos;en développement avec <code className="px-1.5 py-0.5 rounded bg-black/40 text-amber-200 font-mono">SETUP_ALLOW_ENV_WRITE=true</code>.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-white"><Copy className="h-4 w-4 text-blue-300" /> Exporter les variables d&apos;environnement</div>
                  <p className="mt-1 text-[11px] text-slate-400">Copie explicite pour votre gestionnaire de secrets, votre CI/CD ou un fichier local protégé.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowEnv((visible) => !visible)}
                    aria-label={showEnv ? 'Masquer les variables d’environnement' : 'Afficher les variables d’environnement'}
                    title={showEnv ? 'Masquer les variables' : 'Afficher les variables'}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition"
                  >
                    {showEnv ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  <button type="button" onClick={copyEnv} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-500 transition">
                    {envCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {envCopied ? 'Copié' : 'Copier le bloc .env'}
                  </button>
                </div>
              </div>
              <textarea readOnly value={showEnv ? envExport : maskedEnvExport} rows={8} aria-label="Variables d’environnement" className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 font-mono text-[10px] leading-relaxed text-emerald-200 outline-none focus:border-blue-400" />
              <p className="text-[11px] text-amber-200">Ce bloc contient des secrets. Ne le committez jamais, ne le partagez pas dans un ticket et supprimez-le du presse-papiers après utilisation.</p>
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
