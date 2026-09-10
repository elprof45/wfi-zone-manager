'use client';

import React, { useState } from 'react';
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
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function SetupWizardPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [testResult, setTestResult] = useState<{ type: string; success: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    // Step 1: Super Admin
    superAdmin: {
      name: 'Super Administrateur',
      email: 'admin@netpulse.lan',
      password: 'NetPulseSecure2026!',
    },
    // Step 2: PostgreSQL
    database: {
      host: 'localhost',
      port: 5432,
      databaseName: 'netpulse_hotspot',
      username: 'postgres',
      password: 'password123',
    },
    // Step 3: Alerts (SMTP & Telegram)
    smtp: {
      host: 'smtp.gmail.com',
      port: 587,
      username: 'alerts@netpulse.lan',
      password: '',
      senderEmail: 'alerts@netpulse.lan',
    },
    telegram: {
      botToken: '6892341209:AAH17v8K9eZ99_EXAMPLE',
      adminChatId: '109823456',
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
      hotspotDnsName: 'hotspot.local',
    },
  });

  const steps = [
    { num: 1, title: 'Super-Admin', desc: 'Identifiants Maître', icon: ShieldCheck },
    { num: 2, title: 'Base de Données', desc: 'PostgreSQL & Drizzle', icon: Database },
    { num: 3, title: 'Notifications', desc: 'SMTP & Telegram Bot', icon: Bot },
    { num: 4, title: 'Premier Routeur', desc: 'MikroTik Socket API', icon: Router },
    { num: 5, title: 'Finalisation', desc: 'Lancement SaaS', icon: Sparkles },
  ];

  // Test DB connection
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
    } catch (e) {
      setTestResult({ type: 'database', success: false, message: 'Erreur réseau lors du test DB' });
    } finally {
      setIsTesting(false);
    }
  };

  // Test Telegram Bot
  const handleTestTelegram = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/setup/test-telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData.telegram),
      });
      const data = await res.json();
      setTestResult({
        type: 'telegram',
        success: data.success,
        message: data.message || data.error,
      });
    } catch (e) {
      setTestResult({ type: 'telegram', success: false, message: 'Erreur réseau lors du test Telegram' });
    } finally {
      setIsTesting(false);
    }
  };

  // Test MikroTik Socket
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
    } catch (e) {
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
    } catch (err) {
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
              <span>NetPulse Hotspot Manager</span>
              <span className="text-xs px-2 py-0.5 rounded bg-blue-950 text-blue-400 border border-blue-800 font-semibold">
                Setup Wizard v2026
              </span>
            </h1>
            <p className="text-xs text-slate-400">Assistant d&apos;initialisation de l&apos;infrastructure cloud & MikroTik</p>
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
            const Icon = step.icon;
            const isDone = currentStep > step.num;
            const isCurrent = currentStep === step.num;
            return (
              <div
                key={step.num}
                className={`flex items-center gap-2.5 p-2 rounded-xl border transition ${
                  isCurrent
                    ? 'border-blue-500 bg-blue-950/40 text-blue-400'
                    : isDone
                    ? 'border-emerald-800 bg-emerald-950/20 text-emerald-400'
                    : 'border-slate-800/60 text-slate-500'
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
            className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 ${
              testResult.success
                ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                : 'bg-rose-950/40 border-rose-800 text-rose-300'
            }`}
          >
            {testResult.success ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            ) : (
              <HelpCircle className="h-4 w-4 text-rose-400 shrink-0" />
            )}
            <span>{testResult.message}</span>
          </div>
        )}

        {/* STEP 1: Super Admin */}
        {currentStep === 1 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-blue-500" />
                <span>Étape 1 : Création du Compte Super-Administrateur</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Ce compte détiendra les droits de supervision globaux, validation des clôtures de caisse et audit des routeurs.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-300 mb-1">Nom et Prénom *</label>
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
                  className="w-full p-2.5 rounded-lg border border-slate-800 bg-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Email de Connexion *</label>
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
                  className="w-full p-2.5 rounded-lg border border-slate-800 bg-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Mot de Passe Sécurisé *</label>
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
                  className="w-full p-2.5 rounded-lg border border-slate-800 bg-slate-800 text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
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
                  Persistance externe avec Drizzle ORM garantissant le découplage de la mémoire MikroTik.
                </p>
              </div>

              <button
                type="button"
                onClick={handleTestDatabase}
                disabled={isTesting}
                className="px-3 py-1.5 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 border border-purple-500/50 text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                <span>Tester Connexion</span>
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
                  className="w-full p-2.5 rounded-lg border border-slate-800 bg-slate-800 text-white font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Notifications SMTP & Telegram */}
        {currentStep === 3 && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Bot className="h-5 w-5 text-blue-500" />
                <span>Étape 3 : Canaux d&apos;Alertes (Telegram & SMTP)</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Notifications instantanées des clôtures de caisse et commandes interactives (/status, /ca, /cleandisk).
              </p>
            </div>

            {/* Telegram Bot */}
            <div className="rounded-xl border border-slate-800 p-4 bg-slate-800/40 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-xs text-blue-400">
                  <Send className="h-4 w-4" />
                  <span>Bot Telegram Interactif (NetPulse_Bot)</span>
                </div>
                <button
                  type="button"
                  onClick={handleTestTelegram}
                  disabled={isTesting}
                  className="px-2.5 py-1 rounded bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 text-[11px] font-semibold flex items-center gap-1"
                >
                  <RefreshCw className={`h-3 w-3 ${isTesting ? 'animate-spin' : ''}`} />
                  <span>Tester Message Telegram</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Token API Bot *</label>
                  <input
                    type="text"
                    required
                    placeholder="6892341209:AAH17v8K9eZ99_EXAMPLE"
                    value={formData.telegram.botToken}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        telegram: { ...formData.telegram, botToken: e.target.value },
                      })
                    }
                    className="w-full p-2 rounded-lg border border-slate-700 bg-slate-800 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Admin Chat ID *</label>
                  <input
                    type="text"
                    required
                    placeholder="109823456"
                    value={formData.telegram.adminChatId}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        telegram: { ...formData.telegram, adminChatId: e.target.value },
                      })
                    }
                    className="w-full p-2 rounded-lg border border-slate-700 bg-slate-800 text-white font-mono"
                  />
                </div>
              </div>
            </div>

            {/* SMTP */}
            <div className="rounded-xl border border-slate-800 p-4 bg-slate-800/40 space-y-3">
              <div className="flex items-center gap-2 font-bold text-xs text-amber-400">
                <Mail className="h-4 w-4" />
                <span>Passerelle Email SMTP pour Clôtures Comptables</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="sm:col-span-2">
                  <label className="block font-medium text-slate-300 mb-1">Serveur SMTP</label>
                  <input
                    type="text"
                    value={formData.smtp.host}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        smtp: { ...formData.smtp, host: e.target.value },
                      })
                    }
                    className="w-full p-2 rounded-lg border border-slate-700 bg-slate-800 text-white"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Email Expéditeur</label>
                  <input
                    type="email"
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
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: First MikroTik Router */}
        {currentStep === 4 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Router className="h-5 w-5 text-emerald-500" />
                  <span>Étape 4 : Premier Routeur MikroTik (Socket API Port 8728)</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Connexion bidirectionnelle temps réel avec injection protégée contre les surcharges CPU.
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
                  placeholder="hotspot.local"
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
              <h2 className="text-xl font-bold text-white">Prêt pour le Lancement en Production!</h2>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Toutes les couches architecturales sont configurées : Découplage de la base de données, Throttling MikroTik actif (&lt; 15% CPU), Bot Telegram prêt.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl border border-slate-800 bg-slate-800/40 space-y-1">
                <div className="text-slate-400 font-semibold">Super-Admin</div>
                <div className="font-bold text-white truncate">{formData.superAdmin.name}</div>
                <div className="text-[11px] text-slate-400 truncate">{formData.superAdmin.email}</div>
              </div>

              <div className="p-3 rounded-xl border border-slate-800 bg-slate-800/40 space-y-1">
                <div className="text-slate-400 font-semibold">Base de Données</div>
                <div className="font-bold text-white truncate">{formData.database.databaseName}</div>
                <div className="text-[11px] text-slate-400 truncate">{formData.database.host}:5432</div>
              </div>

              <div className="p-3 rounded-xl border border-slate-800 bg-slate-800/40 space-y-1">
                <div className="text-slate-400 font-semibold">Routeur Principal</div>
                <div className="font-bold text-white truncate">{formData.router.name}</div>
                <div className="text-[11px] text-slate-400 truncate">{formData.router.host} (Port 8728)</div>
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
