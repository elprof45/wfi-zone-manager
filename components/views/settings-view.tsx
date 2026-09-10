'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Send,
  Database,
  Mail,
  Cpu,
  Bot,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  Bell,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Calendar,
  Layers,
} from 'lucide-react';
import Link from 'next/link';
import { NotificationLog } from '@/lib/types';

interface SettingsViewProps {
  config: any;
  onRefresh: () => void;
}

export function SettingsView({ config, onRefresh }: SettingsViewProps) {
  // Telegram Bot testing state
  const [telegramCommand, setTelegramCommand] = useState('/status');
  const [isSendingTelegram, setIsSendingTelegram] = useState(false);
  const [telegramLogs, setTelegramLogs] = useState<Array<{ sender: 'user' | 'bot'; text: string; time: string }>>([
    {
      sender: 'bot',
      text: 'NetPulse Hotspot Bot v2026 en ligne.\nCommandes disponibles : /status, /ca, /rapport_jour, /rapport_semaine, /rapport_mois, /cloture, /alertes, /cleandisk',
      time: '10:00',
    },
  ]);

  // Reports Automation Settings State
  const [automationConfig, setAutomationConfig] = useState(
    config?.reportsAutomation || {
      enabled: true,
      dailyReportEnabled: true,
      dailyReportTime: '23:59',
      weeklyReportEnabled: true,
      weeklyReportDay: 'sunday',
      weeklyReportTime: '23:00',
      monthlyReportEnabled: true,
      monthlyReportDay: 1,
      monthlyReportTime: '08:00',
      closureIncomeAlertEnabled: true,
      stockCriticalAlertEnabled: true,
      routerHealthAlertEnabled: true,
      emailRecipients: ['direction@netpulse.lan', 'comptabilite@netpulse.lan'],
      telegramChatId: '@netpulse_direction',
    }
  );

  const [isSavingAutomation, setIsSavingAutomation] = useState(false);
  const [automationFeedback, setAutomationFeedback] = useState<string | null>(null);

  // Notification Logs state
  const [notificationLogs, setNotificationLogs] = useState<NotificationLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [testTriggerResult, setTestTriggerResult] = useState<string | null>(null);

  const fetchNotificationLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const res = await fetch('/api/reports/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotificationLogs(data.notificationLogs || []);
        if (data.reportsAutomation) {
          setAutomationConfig(data.reportsAutomation);
        }
      }
    } catch {
      // fallback
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function initLogs() {
      try {
        const res = await fetch('/api/reports/notifications');
        if (res.ok) {
          const data = await res.json();
          if (!ignore) {
            setNotificationLogs(data.notificationLogs || []);
            if (data.reportsAutomation) {
              setAutomationConfig(data.reportsAutomation);
            }
          }
        }
      } catch {
        // fallback
      }
    }
    initLogs();
    return () => {
      ignore = true;
    };
  }, []);

  const handleSaveAutomation = async () => {
    setIsSavingAutomation(true);
    setAutomationFeedback(null);
    try {
      const res = await fetch('/api/reports/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportsAutomation: automationConfig }),
      });
      if (res.ok) {
        setAutomationFeedback('Paramètres d’automatisation 2026 enregistrés.');
        onRefresh();
      }
    } catch {
      setAutomationFeedback('Erreur lors de l’enregistrement.');
    } finally {
      setIsSavingAutomation(false);
      setTimeout(() => setAutomationFeedback(null), 3000);
    }
  };

  const handleTriggerTestReport = async (reportType: 'daily' | 'weekly' | 'closure' | 'stock_alert', channel: 'telegram' | 'email' | 'both') => {
    setTestTriggerResult(null);
    try {
      const res = await fetch('/api/reports/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportType,
          channel,
          customNotes: 'Déclenché manuellement depuis les Paramètres Système',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTestTriggerResult(`✅ ${data.message}`);
        fetchNotificationLogs();
      } else {
        setTestTriggerResult(`❌ ${data.error || 'Erreur d’expédition'}`);
      }
    } catch {
      setTestTriggerResult('❌ Erreur de communication avec le service.');
    }
    setTimeout(() => setTestTriggerResult(null), 4000);
  };

  // DB test state
  const [isTestingDb, setIsTestingDb] = useState(false);
  const [dbResult, setDbResult] = useState<string | null>(null);

  // SMTP test state
  const [isTestingSmtp, setIsTestingSmtp] = useState(false);
  const [smtpResult, setSmtpResult] = useState<string | null>(null);

  const handleExecuteTelegramCommand = async (cmd: string) => {
    const time = new Date().toLocaleTimeString();
    setTelegramLogs((prev) => [...prev, { sender: 'user', text: cmd, time }]);
    setIsSendingTelegram(true);

    try {
      const res = await fetch('/api/telegram/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: cmd }),
      });
      const data = await res.json();
      setTelegramLogs((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: data.reply || 'Aucune réponse du bot',
          time: new Date().toLocaleTimeString(),
        },
      ]);
      fetchNotificationLogs();
    } catch {
      setTelegramLogs((prev) => [
        ...prev,
        { sender: 'bot', text: 'Erreur de communication avec le Bot Telegram.', time: new Date().toLocaleTimeString() },
      ]);
    } finally {
      setIsSendingTelegram(false);
    }
  };

  const handleTestDatabase = async () => {
    setIsTestingDb(true);
    setDbResult(null);
    try {
      const res = await fetch('/api/setup/test-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: config?.database?.host || 'localhost',
          port: config?.database?.port || 5432,
          databaseName: config?.database?.databaseName || 'netpulse_hotspot',
          username: config?.database?.username || 'postgres',
        }),
      });
      const data = await res.json();
      setDbResult(data.message || 'Connexion base de données validée.');
    } catch {
      setDbResult('Erreur de connexion à la base de données.');
    } finally {
      setIsTestingDb(false);
    }
  };

  const handleTestSmtp = async () => {
    setIsTestingSmtp(true);
    setSmtpResult(null);
    try {
      const res = await fetch('/api/setup/test-smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: config?.smtp?.host || 'smtp.gmail.com',
          port: config?.smtp?.port || 587,
          senderEmail: config?.smtp?.senderEmail || 'alert@netpulse.lan',
        }),
      });
      const data = await res.json();
      setSmtpResult(data.message || 'Email de test expédié.');
    } catch {
      setSmtpResult('Erreur d’expédition SMTP.');
    } finally {
      setIsTestingSmtp(false);
    }
  };

  return (
    <div id="settings-view-container" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-neutral-950 dark:text-white flex items-center gap-2">
            <SettingsIcon className="h-5 w-5 text-neutral-900 dark:text-neutral-100" />
            <span>Paramètres Système & Intégrations</span>
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Console Telegram Bot, passerelles d&apos;alertes SMTP, base PostgreSQL et protection CPU
          </p>
        </div>

        <Link
          href="/setup"
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs font-medium transition"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>Relancer l&apos;Assistant de Configuration</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Telegram Interactive Console */}
        <div className="rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#141416] p-6 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-neutral-950 dark:text-white text-base flex items-center gap-2">
                <Bot className="h-4 w-4 text-neutral-800 dark:text-neutral-200" />
                <span>Console Interactive Telegram Bot</span>
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200">
                En ligne
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Commandes de supervision directe du réseau Hotspot
            </p>
          </div>

          {/* Chat / Terminal Area */}
          <div className="h-64 rounded-xl bg-neutral-900 dark:bg-neutral-950 border border-neutral-800 p-3.5 overflow-y-auto space-y-2.5 font-mono text-xs text-neutral-200">
            {telegramLogs.map((log, i) => (
              <div
                key={i}
                className={`p-2.5 rounded-xl max-w-[85%] whitespace-pre-wrap ${
                  log.sender === 'user'
                    ? 'ml-auto bg-white text-black font-sans'
                    : 'mr-auto bg-neutral-800/80 text-neutral-200 border border-neutral-700/60'
                }`}
              >
                <div className="text-[9px] opacity-50 mb-0.5">{log.time}</div>
                <div>{log.text}</div>
              </div>
            ))}
            {isSendingTelegram && (
              <div className="text-neutral-400 text-[11px] animate-pulse">
                Exécution de la commande via l&apos;API Telegram...
              </div>
            )}
          </div>

          {/* Quick Command Buttons */}
          <div className="space-y-2">
            <div className="text-[11px] font-medium text-neutral-500">Commandes rapides :</div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleExecuteTelegramCommand('/status')}
                disabled={isSendingTelegram}
                className="px-3 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-mono font-medium transition"
              >
                /status
              </button>
              <button
                onClick={() => handleExecuteTelegramCommand('/ca')}
                disabled={isSendingTelegram}
                className="px-3 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-mono font-medium transition"
              >
                /ca
              </button>
              <button
                onClick={() => handleExecuteTelegramCommand('/cleandisk')}
                disabled={isSendingTelegram}
                className="px-3 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-mono font-medium transition"
              >
                /cleandisk
              </button>
              <button
                onClick={() => handleExecuteTelegramCommand('/rapport_jour')}
                disabled={isSendingTelegram}
                className="px-3 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-mono font-medium transition"
              >
                /rapport_jour
              </button>
              <button
                onClick={() => handleExecuteTelegramCommand('/cloture')}
                disabled={isSendingTelegram}
                className="px-3 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-mono font-medium transition"
              >
                /cloture
              </button>
              <button
                onClick={() => handleExecuteTelegramCommand('/alertes')}
                disabled={isSendingTelegram}
                className="px-3 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-mono font-medium transition"
              >
                /alertes
              </button>
            </div>

            {/* Input bar */}
            <div className="flex gap-2 pt-1">
              <input
                type="text"
                placeholder="Entrez une commande (ex: /status)..."
                value={telegramCommand}
                onChange={(e) => setTelegramCommand(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleExecuteTelegramCommand(telegramCommand);
                  }
                }}
                className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white font-mono focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
              />
              <button
                onClick={() => handleExecuteTelegramCommand(telegramCommand)}
                disabled={isSendingTelegram}
                className="px-4 py-2 rounded-xl bg-black hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-black text-xs font-medium transition flex items-center justify-center"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* System & Connectors Health */}
        <div className="space-y-4">
          {/* Database PostgreSQL */}
          <div className="rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#141416] p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-neutral-950 dark:text-white text-base flex items-center gap-2">
                <Database className="h-4 w-4 text-neutral-800 dark:text-neutral-200" />
                <span>Base de Données PostgreSQL</span>
              </h3>
              <button
                onClick={handleTestDatabase}
                disabled={isTestingDb}
                className="px-3 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-xs font-medium text-neutral-700 dark:text-neutral-300 transition flex items-center gap-1.5"
              >
                <RefreshCw className={`h-3 w-3 ${isTestingDb ? 'animate-spin' : ''}`} />
                <span>Tester</span>
              </button>
            </div>
            <div className="text-xs text-neutral-500 space-y-1">
              <div>Hôte : <span className="font-mono font-medium text-neutral-800 dark:text-neutral-200">{config?.database?.host || 'localhost:5432'}</span></div>
              <div>Base : <span className="font-mono font-medium text-neutral-800 dark:text-neutral-200">{config?.database?.databaseName || 'netpulse_hotspot'}</span></div>
              <div>ORM : <span className="font-medium text-neutral-950 dark:text-white">Drizzle ORM (5 tables)</span></div>
            </div>
            {dbResult && (
              <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-neutral-950 dark:text-white shrink-0" />
                <span>{dbResult}</span>
              </div>
            )}
          </div>

          {/* SMTP Gateway */}
          <div className="rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#141416] p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-neutral-950 dark:text-white text-base flex items-center gap-2">
                <Mail className="h-4 w-4 text-neutral-800 dark:text-neutral-200" />
                <span>Passerelle Email SMTP</span>
              </h3>
              <button
                onClick={handleTestSmtp}
                disabled={isTestingSmtp}
                className="px-3 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-xs font-medium text-neutral-700 dark:text-neutral-300 transition flex items-center gap-1.5"
              >
                <RefreshCw className={`h-3 w-3 ${isTestingSmtp ? 'animate-spin' : ''}`} />
                <span>Tester</span>
              </button>
            </div>
            <div className="text-xs text-neutral-500 space-y-1">
              <div>Serveur SMTP : <span className="font-mono font-medium text-neutral-800 dark:text-neutral-200">{config?.smtp?.host || 'smtp.gmail.com:587'}</span></div>
              <div>Expéditeur : <span className="font-mono font-medium text-neutral-800 dark:text-neutral-200">{config?.smtp?.senderEmail || 'alerts@netpulse.lan'}</span></div>
            </div>
            {smtpResult && (
              <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-neutral-950 dark:text-white shrink-0" />
                <span>{smtpResult}</span>
              </div>
            )}
          </div>

          {/* Throttling Engine Settings */}
          <div className="rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#141416] p-5 shadow-sm space-y-3">
            <h3 className="font-semibold text-neutral-950 dark:text-white text-base flex items-center gap-2">
              <Cpu className="h-4 w-4 text-neutral-800 dark:text-neutral-200" />
              <span>Paramètres Throttling MikroTik</span>
            </h3>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Protection matérielle contre les surcharges CPU sur les modèles RouterBOARD (RB951Ui, hEX S).
            </p>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800">
                <div className="text-neutral-500">Taille de Lot</div>
                <div className="font-semibold text-neutral-950 dark:text-white text-sm mt-0.5">20 fiches / injection</div>
              </div>
              <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800">
                <div className="text-neutral-500">Délai de Sécurité</div>
                <div className="font-semibold text-neutral-950 dark:text-white text-sm mt-0.5">50 millisecondes</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reports & Alert Automation 2026 Engine */}
      <div className="rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#141416] p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 dark:border-neutral-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-neutral-950 dark:text-white text-base">
                Moteur d&apos;Automatisation des Rapports & Alertes (2026)
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Planification des rapports de ventes, alertes de stock critique et réconciliation de caisse via Telegram & Email
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {automationFeedback && (
              <span className="text-xs text-neutral-900 dark:text-white font-medium animate-fade-in flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {automationFeedback}
              </span>
            )}
            <button
              onClick={handleSaveAutomation}
              disabled={isSavingAutomation}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-black hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-black text-xs font-medium shadow-sm transition disabled:opacity-40"
            >
              {isSavingAutomation ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              <span>Sauvegarder l&apos;Automatisation</span>
            </button>
          </div>
        </div>

        {/* Channels Configuration */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/30 space-y-2">
            <label className="text-xs font-semibold text-neutral-900 dark:text-white flex items-center gap-1.5">
              <Bot className="h-3.5 w-3.5" />
              <span>Identifiant Canal / Groupe Telegram</span>
            </label>
            <input
              type="text"
              value={automationConfig.telegramChatId || ''}
              onChange={(e) => setAutomationConfig({ ...automationConfig, telegramChatId: e.target.value })}
              placeholder="@netpulse_direction ou ID numérique (ex: -10012345678)"
              className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white font-mono focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
            />
            <p className="text-[11px] text-neutral-400">
              Le bot Telegram NetPulse publiera automatiquement les synthèses dans ce groupe ou canal.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/30 space-y-2">
            <label className="text-xs font-semibold text-neutral-900 dark:text-white flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" />
              <span>Destinataires Email Compta & Direction</span>
            </label>
            <input
              type="text"
              value={(automationConfig.emailRecipients || []).join(', ')}
              onChange={(e) =>
                setAutomationConfig({
                  ...automationConfig,
                  emailRecipients: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                })
              }
              placeholder="direction@netpulse.lan, comptabilite@netpulse.lan"
              className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white font-mono focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
            />
            <p className="text-[11px] text-neutral-400">
              Les rapports HTML certifiés sont expédiés automatiquement à ces adresses.
            </p>
          </div>
        </div>

        {/* Automation Triggers Toggles Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Daily Report Toggle */}
          <div className="p-4 rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-[#18181b] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-950 dark:text-white flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                <span>Rapport Journalier des Ventes</span>
              </span>
              <input
                type="checkbox"
                checked={automationConfig.dailyReportEnabled}
                onChange={(e) => setAutomationConfig({ ...automationConfig, dailyReportEnabled: e.target.checked })}
                className="h-4 w-4 rounded accent-black dark:accent-white cursor-pointer"
              />
            </div>
            <div className="flex items-center justify-between text-xs text-neutral-500">
              <span>Heure d&apos;envoi automatique :</span>
              <input
                type="time"
                value={automationConfig.dailyReportTime || '23:59'}
                onChange={(e) => setAutomationConfig({ ...automationConfig, dailyReportTime: e.target.value })}
                className="px-2 py-0.5 rounded border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white text-xs font-mono"
              />
            </div>
          </div>

          {/* Weekly Report Toggle */}
          <div className="p-4 rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-[#18181b] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-950 dark:text-white flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                <span>Rapport Hebdomadaire Consolidé</span>
              </span>
              <input
                type="checkbox"
                checked={automationConfig.weeklyReportEnabled}
                onChange={(e) => setAutomationConfig({ ...automationConfig, weeklyReportEnabled: e.target.checked })}
                className="h-4 w-4 rounded accent-black dark:accent-white cursor-pointer"
              />
            </div>
            <div className="flex items-center justify-between text-xs text-neutral-500">
              <span>Jour & Heure :</span>
              <span className="font-mono text-neutral-900 dark:text-white">Dimanche 23:00</span>
            </div>
          </div>

          {/* Monthly Report Toggle */}
          <div className="p-4 rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-[#18181b] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-950 dark:text-white flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5" />
                <span>Rapport Mensuel des Recettes</span>
              </span>
              <input
                type="checkbox"
                checked={automationConfig.monthlyReportEnabled}
                onChange={(e) => setAutomationConfig({ ...automationConfig, monthlyReportEnabled: e.target.checked })}
                className="h-4 w-4 rounded accent-black dark:accent-white cursor-pointer"
              />
            </div>
            <div className="flex items-center justify-between text-xs text-neutral-500">
              <span>Planification :</span>
              <span className="font-mono text-neutral-900 dark:text-white">1er du mois 08:00</span>
            </div>
          </div>

          {/* Closure Income Alert Toggle */}
          <div className="p-4 rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-[#18181b] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-950 dark:text-white flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Alerte Clôture de Caisse (Incomes)</span>
              </span>
              <input
                type="checkbox"
                checked={automationConfig.closureIncomeAlertEnabled}
                onChange={(e) => setAutomationConfig({ ...automationConfig, closureIncomeAlertEnabled: e.target.checked })}
                className="h-4 w-4 rounded accent-black dark:accent-white cursor-pointer"
              />
            </div>
            <p className="text-[11px] text-neutral-400">
              Diffusion immédiate du certificat dès qu&apos;une caisse est scellée avec purge mémoire.
            </p>
          </div>

          {/* Stock Critical Alert Toggle */}
          <div className="p-4 rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-[#18181b] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-950 dark:text-white flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>Alertes de Stock Critique</span>
              </span>
              <input
                type="checkbox"
                checked={automationConfig.stockCriticalAlertEnabled}
                onChange={(e) => setAutomationConfig({ ...automationConfig, stockCriticalAlertEnabled: e.target.checked })}
                className="h-4 w-4 rounded accent-black dark:accent-white cursor-pointer"
              />
            </div>
            <p className="text-[11px] text-neutral-400">
              Déclenche une notification si un profil passe sous son seuil de sécurité (&lt;15 tickets).
            </p>
          </div>

          {/* Router Health Alert Toggle */}
          <div className="p-4 rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-[#18181b] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-950 dark:text-white flex items-center gap-1.5">
                <Cpu className="h-3.5 w-3.5" />
                <span>Alerte Santé Matériel RouterOS</span>
              </span>
              <input
                type="checkbox"
                checked={automationConfig.routerHealthAlertEnabled}
                onChange={(e) => setAutomationConfig({ ...automationConfig, routerHealthAlertEnabled: e.target.checked })}
                className="h-4 w-4 rounded accent-black dark:accent-white cursor-pointer"
              />
            </div>
            <p className="text-[11px] text-neutral-400">
              Notification automatique si CPU &gt; 80% ou RAM libre &lt; 20 MB sur un routeur.
            </p>
          </div>
        </div>

        {/* Interactive Instant Test Triggers */}
        <div className="p-4 rounded-xl bg-neutral-100/60 dark:bg-neutral-900/40 border border-neutral-200 dark:border-neutral-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-950 dark:text-white">
              Déclencheurs Manuels pour Test Instantané
            </span>
            {testTriggerResult && (
              <span className="text-xs font-medium text-neutral-900 dark:text-white animate-fade-in">
                {testTriggerResult}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleTriggerTestReport('daily', 'telegram')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-medium transition"
            >
              <Bot className="h-3.5 w-3.5" />
              <span>Tester Rapport Journalier (Telegram)</span>
            </button>
            <button
              onClick={() => handleTriggerTestReport('daily', 'email')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-medium transition"
            >
              <Mail className="h-3.5 w-3.5" />
              <span>Tester Rapport Journalier (Email)</span>
            </button>
            <button
              onClick={() => handleTriggerTestReport('closure', 'both')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-medium transition"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Tester Clôture Incomes (Telegram & Email)</span>
            </button>
            <button
              onClick={() => handleTriggerTestReport('stock_alert', 'telegram')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-medium transition"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Tester Alerte Stock Critique</span>
            </button>
          </div>
        </div>
      </div>

      {/* Notification Logs Audit Trail */}
      <div className="rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#141416] p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-neutral-950 dark:text-white text-base flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-neutral-800 dark:text-neutral-200" />
              <span>Journal d&apos;Audit des Notifications & Alertes Expédiées</span>
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Traçabilité en temps réel des envois automatiques et manuels (Telegram & Passerelle SMTP)
            </p>
          </div>
          <button
            onClick={fetchNotificationLogs}
            disabled={isLoadingLogs}
            className="p-1.5 rounded-full border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoadingLogs ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 dark:bg-neutral-900/60 border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 font-medium">
              <tr>
                <th className="py-2.5 px-3">Date & Heure</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Canal</th>
                <th className="py-2.5 px-3">Destinataire</th>
                <th className="py-2.5 px-3">Résumé de la Notification</th>
                <th className="py-2.5 px-3">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 text-neutral-700 dark:text-neutral-300">
              {notificationLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-neutral-400">
                    Aucune notification enregistrée pour le moment.
                  </td>
                </tr>
              ) : (
                notificationLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-900/30">
                    <td className="py-2.5 px-3 font-mono text-[11px] text-neutral-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString('fr-FR')}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-neutral-950 dark:text-white whitespace-nowrap">
                      {log.type === 'daily_report'
                        ? 'Rapport Journalier'
                        : log.type === 'weekly_report'
                        ? 'Rapport Hebdomadaire'
                        : log.type === 'monthly_report'
                        ? 'Rapport Mensuel'
                        : log.type === 'closure_income'
                        ? 'Clôture Caisse'
                        : log.type === 'critical_stock_alert'
                        ? 'Alerte Stock'
                        : 'Alerte Routeur'}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 uppercase">
                        {log.channel}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-neutral-600 dark:text-neutral-400 max-w-[160px] truncate">
                      {log.recipient}
                    </td>
                    <td className="py-2.5 px-3 text-neutral-600 dark:text-neutral-300 max-w-xs truncate">
                      {log.summary}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-neutral-950 dark:text-white">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Distribué</span>
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

