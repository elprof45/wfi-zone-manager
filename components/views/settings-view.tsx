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
  Globe,
  Sliders,
  Save,
  FileCode,
  Copy,
  Check,
  Terminal,
  Activity,
  Play,
  CheckSquare,
  Square,
  Zap,
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

  // 1. General Settings State
  const [generalConfig, setGeneralConfig] = useState({
    businessName: config?.general?.appName || config?.general?.businessName || config?.general?.companyName || 'NetPulse Hotspot',
    currency: config?.general?.currency || 'FCFA',
    timezone: config?.general?.timezone || 'Africa/Abidjan',
    lowStockThreshold: config?.general?.lowStockThreshold || 15,
  });
  const [isSavingGeneral, setIsSavingGeneral] = useState(false);
  const [generalFeedback, setGeneralFeedback] = useState<string | null>(null);

  // 2. Database Connection State
  const [dbState, setDbState] = useState({
    host: config?.database?.host || 'localhost',
    port: Number(config?.database?.port) || 5434,
    databaseName: config?.database?.databaseName || 'netpulse_hotspot_db',
    username: config?.database?.username || 'netpulse_hotspot',
  });
  const [isTestingDb, setIsTestingDb] = useState(false);
  const [dbResult, setDbResult] = useState<string | null>(null);

  // 3. Email Gateway State (Resend API + SMTP Fallback)
  const [smtpConfig, setSmtpConfig] = useState({
    provider: (config?.smtp?.provider as 'resend' | 'smtp') || (config?.smtp?.resendApiKey ? 'resend' : 'resend'),
    resendApiKey: config?.smtp?.resendApiKey || '',
    host: config?.smtp?.host || '',
    port: Number(config?.smtp?.port) || 587,
    secure: config?.smtp?.secure ?? false,
    user: config?.smtp?.username || config?.smtp?.user || '',
    pass: config?.smtp?.password || config?.smtp?.pass || '',
    from: config?.smtp?.senderEmail || config?.smtp?.from || '',
    recipients: config?.smtp?.recipients || ['direction@netpulse.lan'],
  });
  const [isSavingSmtp, setIsSavingSmtp] = useState(false);
  const [isTestingSmtp, setIsTestingSmtp] = useState(false);
  const [smtpFeedback, setSmtpFeedback] = useState<string | null>(null);
  const [smtpResult, setSmtpResult] = useState<string | null>(null);

  // Multi-Choice Bots & Active Notification Channels
  const [activeBots, setActiveBots] = useState({
    telegram: config?.notifications?.telegram ?? true,
    email: config?.notifications?.email ?? true,
    discord: config?.notifications?.discord ?? false,
    slack: config?.notifications?.slack ?? false,
    whatsapp: config?.notifications?.whatsapp ?? false,
  });
  const [isSavingBots, setIsSavingBots] = useState(false);
  const [botsFeedback, setBotsFeedback] = useState<string | null>(null);

  // Background Tasks / Cron Status
  const [cronStatus, setCronStatus] = useState<{
    dbConnected: boolean;
    cron: { initialized: boolean; isBackgroundEnabled: boolean; stats: any };
  } | null>(null);
  const [isTriggeringTask, setIsTriggeringTask] = useState<string | null>(null);
  const [cronFeedback, setCronFeedback] = useState<string | null>(null);

  const fetchCronStatus = async () => {
    try {
      const res = await fetch('/api/cron/status');
      if (res.ok) {
        const data = await res.json();
        setCronStatus(data);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchCronStatus();
  }, []);

  const handleTriggerCronTask = async (task: 'ping_routers' | 'stock_check' | 'daily_closure') => {
    setIsTriggeringTask(task);
    setCronFeedback(null);
    try {
      const res = await fetch('/api/cron/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task }),
      });
      const data = await res.json();
      if (data.success) {
        setCronFeedback(`✅ ${data.message}`);
        fetchCronStatus();
      } else {
        setCronFeedback(`❌ ${data.error || 'Échec de la tâche'}`);
      }
    } catch {
      setCronFeedback('❌ Erreur de communication avec le planificateur.');
    } finally {
      setIsTriggeringTask(null);
      setTimeout(() => setCronFeedback(null), 5000);
    }
  };

  const handleSaveActiveBots = async () => {
    setIsSavingBots(true);
    setBotsFeedback(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'notifications',
          value: activeBots,
        }),
      });
      if (res.ok) {
        setBotsFeedback('Préférences des bots et canaux enregistrées !');
        onRefresh();
      } else {
        setBotsFeedback('Erreur lors de l’enregistrement.');
      }
    } catch {
      setBotsFeedback('Erreur réseau.');
    } finally {
      setIsSavingBots(false);
      setTimeout(() => setBotsFeedback(null), 3000);
    }
  };

  // 4. Multi-Channel State (Discord, Slack, WhatsApp)
  const [channelConfigs, setChannelConfigs] = useState({
    discordWebhookUrl: config?.discord?.webhookUrl || '',
    slackWebhookUrl: config?.slack?.webhookUrl || '',
    whatsappSid: config?.whatsapp?.accountSid || '',
    whatsappAuthToken: config?.whatsapp?.authToken || '',
    whatsappNumber: config?.whatsapp?.to || '',
  });
  const [isSavingChannels, setIsSavingChannels] = useState(false);
  const [channelsFeedback, setChannelsFeedback] = useState<string | null>(null);

  // 5. Reports Automation Settings State
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
      telegramChatId: config?.telegram?.adminChatId || '@netpulse_direction',
      discordWebhookUrl: config?.discord?.webhookUrl || '',
      slackWebhookUrl: config?.slack?.webhookUrl || '',
      whatsappNumber: config?.whatsapp?.to || '',
    }
  );
  const [isSavingAutomation, setIsSavingAutomation] = useState(false);
  const [automationFeedback, setAutomationFeedback] = useState<string | null>(null);

  // Notification Logs state
  const [notificationLogs, setNotificationLogs] = useState<NotificationLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [testTriggerResult, setTestTriggerResult] = useState<string | null>(null);

  // .env Manager State
  const [envData, setEnvData] = useState<Record<string, { value: string; isSecret: boolean }>>({});
  const [envRawPreview, setEnvRawPreview] = useState('');
  const [isLoadingEnv, setIsLoadingEnv] = useState(false);
  const [isSyncingEnv, setIsSyncingEnv] = useState(false);
  const [envCopied, setEnvCopied] = useState(false);
  const [envSyncMsg, setEnvSyncMsg] = useState<string | null>(null);

  const fetchEnvData = async () => {
    setIsLoadingEnv(true);
    try {
      const res = await fetch('/api/settings/env');
      if (res.ok) {
        const data = await res.json();
        setEnvData(data.env || {});
        setEnvRawPreview(data.rawPreview || '');
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingEnv(false);
    }
  };

  useEffect(() => {
    fetchEnvData();
  }, []);

  const handleSyncCurrentToEnv = async () => {
    setIsSyncingEnv(true);
    setEnvSyncMsg(null);
    try {
      const updates: Record<string, string | number | boolean> = {
        NEXT_PUBLIC_APP_NAME: generalConfig.businessName,
        DEFAULT_CURRENCY: generalConfig.currency,
        DEFAULT_TIMEZONE: generalConfig.timezone,
        LOW_STOCK_THRESHOLD: Number(generalConfig.lowStockThreshold),
        POSTGRES_HOST: dbState.host,
        POSTGRES_PORT: Number(dbState.port),
        POSTGRES_USER: dbState.username,
        POSTGRES_DB: dbState.databaseName,
        DATABASE_URL: `postgresql://${dbState.username}:netpulse_hotspot@${dbState.host}:${dbState.port}/${dbState.databaseName}`,
      };

      if (smtpConfig.host) updates.SMTP_HOST = smtpConfig.host;
      if (smtpConfig.port) updates.SMTP_PORT = Number(smtpConfig.port);
      if (smtpConfig.user) updates.SMTP_USER = smtpConfig.user;
      if (smtpConfig.pass) updates.SMTP_PASS = smtpConfig.pass;
      if (smtpConfig.from) updates.SMTP_FROM = smtpConfig.from;
      if (Array.isArray(smtpConfig.recipients)) updates.NOTIFICATION_EMAILS = smtpConfig.recipients.join(', ');

      if (channelConfigs.discordWebhookUrl) updates.DISCORD_WEBHOOK_URL = channelConfigs.discordWebhookUrl;
      if (channelConfigs.slackWebhookUrl) updates.SLACK_WEBHOOK_URL = channelConfigs.slackWebhookUrl;
      if (channelConfigs.whatsappSid) updates.TWILIO_ACCOUNT_SID = channelConfigs.whatsappSid;
      if (channelConfigs.whatsappAuthToken) updates.TWILIO_AUTH_TOKEN = channelConfigs.whatsappAuthToken;
      if (channelConfigs.whatsappNumber) updates.TWILIO_WHATSAPP_TO = channelConfigs.whatsappNumber;

      const res = await fetch('/api/settings/env', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });

      if (res.ok) {
        setEnvSyncMsg('Fichier .env synchronisé avec succès !');
        fetchEnvData();
        setTimeout(() => setEnvSyncMsg(null), 4000);
      } else {
        setEnvSyncMsg('Échec de la synchronisation');
      }
    } catch {
      setEnvSyncMsg('Erreur réseau');
    } finally {
      setIsSyncingEnv(false);
    }
  };

  const handleCopyEnv = () => {
    if (!envRawPreview) return;
    navigator.clipboard.writeText(envRawPreview);
    setEnvCopied(true);
    setTimeout(() => setEnvCopied(false), 2000);
  };

  // Load all live settings on mount or config prop change
  useEffect(() => {
    if (config) {
      if (config.general) {
        setGeneralConfig({
          businessName: config.general.appName || config.general.businessName || config.general.companyName || 'NetPulse Hotspot',
          currency: config.general.currency || 'FCFA',
          timezone: config.general.timezone || 'Africa/Abidjan',
          lowStockThreshold: config.general.lowStockThreshold || 15,
        });
      }
      if (config.database) {
        setDbState({
          host: config.database.host || 'localhost',
          port: Number(config.database.port) || 5434,
          databaseName: config.database.databaseName || 'netpulse_hotspot_db',
          username: config.database.username || 'netpulse_hotspot',
        });
      }
      if (config.smtp) {
        setSmtpConfig({
          provider: (config.smtp.provider as 'resend' | 'smtp') || (config.smtp.resendApiKey ? 'resend' : 'resend'),
          resendApiKey: config.smtp.resendApiKey || '',
          host: config.smtp.host || '',
          port: Number(config.smtp.port) || 587,
          secure: config.smtp.secure ?? false,
          user: config.smtp.username || config.smtp.user || '',
          pass: config.smtp.password || config.smtp.pass || '',
          from: config.smtp.senderEmail || config.smtp.from || '',
          recipients: config.smtp.recipients || ['direction@netpulse.lan'],
        });
      }
      if (config.discord || config.slack || config.whatsapp) {
        setChannelConfigs({
          discordWebhookUrl: config.discord?.webhookUrl || '',
          slackWebhookUrl: config.slack?.webhookUrl || '',
          whatsappSid: config.whatsapp?.accountSid || '',
          whatsappAuthToken: config.whatsapp?.authToken || '',
          whatsappNumber: config.whatsapp?.to || '',
        });
      }
    }
  }, [config]);

  const fetchNotificationLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const res = await fetch('/api/reports/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotificationLogs(data.notificationLogs || []);
        if (data.reportsAutomation) {
          setAutomationConfig((prev: any) => ({ ...prev, ...data.reportsAutomation }));
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
              setAutomationConfig((prev: any) => ({ ...prev, ...data.reportsAutomation }));
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

  // Save General Settings
  const handleSaveGeneral = async () => {
    setIsSavingGeneral(true);
    setGeneralFeedback(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'general',
          value: {
            businessName: generalConfig.businessName,
            currency: generalConfig.currency,
            timezone: generalConfig.timezone,
            language: 'fr',
            lowStockThreshold: Number(generalConfig.lowStockThreshold),
          },
        }),
      });
      if (res.ok) {
        setGeneralFeedback('Paramètres généraux enregistrés.');
        onRefresh();
      } else {
        setGeneralFeedback('Erreur lors de la sauvegarde.');
      }
    } catch {
      setGeneralFeedback('Erreur réseau.');
    } finally {
      setIsSavingGeneral(false);
      setTimeout(() => setGeneralFeedback(null), 3000);
    }
  };

  // Save SMTP Settings
  const handleSaveSmtp = async () => {
    setIsSavingSmtp(true);
    setSmtpFeedback(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'smtp',
          value: {
            host: smtpConfig.host,
            port: Number(smtpConfig.port),
            secure: smtpConfig.secure,
            user: smtpConfig.user,
            pass: smtpConfig.pass,
            from: smtpConfig.from || 'alerts@netpulse.lan',
            recipients: Array.isArray(smtpConfig.recipients) ? smtpConfig.recipients : [smtpConfig.recipients],
          },
        }),
      });
      if (res.ok) {
        setSmtpFeedback('Passerelle SMTP enregistrée.');
        onRefresh();
      } else {
        setSmtpFeedback('Erreur de validation SMTP.');
      }
    } catch {
      setSmtpFeedback('Erreur réseau.');
    } finally {
      setIsSavingSmtp(false);
      setTimeout(() => setSmtpFeedback(null), 3000);
    }
  };

  // Save Multi-Channel Notification Webhooks
  const handleSaveChannels = async () => {
    setIsSavingChannels(true);
    setChannelsFeedback(null);
    try {
      await Promise.all([
        fetch('/api/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            key: 'discord',
            value: { webhookUrl: channelConfigs.discordWebhookUrl, enabled: true },
          }),
        }),
        fetch('/api/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            key: 'slack',
            value: { webhookUrl: channelConfigs.slackWebhookUrl, enabled: true },
          }),
        }),
        fetch('/api/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            key: 'whatsapp',
            value: {
              accountSid: channelConfigs.whatsappSid,
              authToken: channelConfigs.whatsappAuthToken,
              to: channelConfigs.whatsappNumber,
              enabled: true,
            },
          }),
        }),
      ]);
      setChannelsFeedback('Canaux Discord, Slack et WhatsApp enregistrés.');
      onRefresh();
    } catch {
      setChannelsFeedback('Erreur lors de l’enregistrement des canaux.');
    } finally {
      setIsSavingChannels(false);
      setTimeout(() => setChannelsFeedback(null), 3000);
    }
  };

  // Save Automation Settings
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
        setAutomationFeedback('Paramètres d’automatisation enregistrés.');
        onRefresh();
      } else {
        setAutomationFeedback('Erreur lors de l’enregistrement.');
      }
    } catch {
      setAutomationFeedback('Erreur réseau lors de l’enregistrement.');
    } finally {
      setIsSavingAutomation(false);
      setTimeout(() => setAutomationFeedback(null), 3000);
    }
  };

  // Trigger test reports
  const handleTriggerTestReport = async (
    reportType: 'daily' | 'weekly' | 'closure' | 'stock_alert',
    channel: 'telegram' | 'email' | 'both' | 'discord' | 'slack' | 'whatsapp' | 'all'
  ) => {
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

  // Test single channel
  const handleTestChannel = async (channel: 'discord' | 'slack' | 'whatsapp') => {
    setTestTriggerResult(null);
    try {
      let payload: any = {};
      if (channel === 'discord') payload = { webhookUrl: channelConfigs.discordWebhookUrl };
      else if (channel === 'slack') payload = { webhookUrl: channelConfigs.slackWebhookUrl };
      else if (channel === 'whatsapp') payload = { to: channelConfigs.whatsappNumber, accountSid: channelConfigs.whatsappSid, authToken: channelConfigs.whatsappAuthToken };

      const res = await fetch(`/api/setup/test-${channel}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setTestTriggerResult(`✅ Test ${channel.toUpperCase()} : ${data.message || 'Succès'}`);
        fetchNotificationLogs();
      } else {
        setTestTriggerResult(`❌ Test ${channel}: ${data.error || 'Échec'}`);
      }
    } catch {
      setTestTriggerResult(`❌ Erreur de communication avec l'endpoint ${channel}.`);
    }
    setTimeout(() => setTestTriggerResult(null), 4000);
  };

  // Test Database
  const handleTestDatabase = async () => {
    setIsTestingDb(true);
    setDbResult(null);
    try {
      const res = await fetch('/api/setup/test-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dbState),
      });
      const data = await res.json();
      if (data.success) {
        setDbResult(data.message || `PostgreSQL connecté (${data.latencyMs}ms).`);
      } else {
        setDbResult(`Erreur: ${data.error}`);
      }
    } catch {
      setDbResult('Erreur de connexion à la base de données.');
    } finally {
      setIsTestingDb(false);
    }
  };

  // Test SMTP
  const handleTestSmtp = async () => {
    setIsTestingSmtp(true);
    setSmtpResult(null);
    try {
      const res = await fetch('/api/setup/test-smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: smtpConfig.host,
          port: smtpConfig.port,
          useTls: smtpConfig.secure,
          username: smtpConfig.user,
          password: smtpConfig.pass,
          senderEmail: smtpConfig.from,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSmtpResult(data.message || 'Test SMTP réussi !');
      } else {
        setSmtpResult(`Erreur SMTP : ${data.error}`);
      }
    } catch {
      setSmtpResult('Erreur réseau lors du test SMTP.');
    } finally {
      setIsTestingSmtp(false);
    }
  };

  // Execute Telegram Console Command
  const handleExecuteTelegramCommand = async (cmd: string) => {
    if (!cmd.trim()) return;
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

  return (
    <div id="settings-view-container" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-neutral-950 dark:text-white flex items-center gap-2">
            <SettingsIcon className="h-5 w-5 text-neutral-900 dark:text-neutral-100" />
            <span>Paramètres Système & Configurations Dynamiques</span>
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Paramétrage en direct : Général, PostgreSQL, Passerelle SMTP, Hub Multi-Canaux et Automatisations
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

      {/* .env File Synchronization & Live Inspector Card */}
      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                <span>Fichier d&apos;Environnement Système (.env)</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  Actif &amp; Synchronisé
                </span>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Variables système injectées dans Docker et persistées localement à la racine du projet
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {envSyncMsg && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 animate-in fade-in">
                <Check className="w-3.5 h-3.5" />
                {envSyncMsg}
              </span>
            )}
            <button
              onClick={handleSyncCurrentToEnv}
              disabled={isSyncingEnv}
              className="px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.98] text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingEnv ? 'animate-spin' : ''}`} />
              <span>Synchroniser vers .env</span>
            </button>
            <button
              onClick={handleCopyEnv}
              className="px-3 py-1.5 rounded-xl border border-border hover:bg-muted text-xs font-medium transition flex items-center gap-1.5 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              {envCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{envCopied ? 'Copié !' : 'Copier'}</span>
            </button>
          </div>
        </div>

        {/* Variables Pills Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {Object.entries(envData).length > 0 ? (
            Object.entries(envData).slice(0, 12).map(([key, item]) => (
              <div
                key={key}
                className="p-2.5 rounded-xl border border-border bg-muted/40 flex flex-col justify-between space-y-1 hover:border-primary/30 transition"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-semibold text-foreground truncate">{key}</span>
                  {item.isSecret && (
                    <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium">
                      Secret
                    </span>
                  )}
                </div>
                <div className="font-mono text-[10px] text-muted-foreground truncate">{item.value || '""'}</div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-4 text-center text-xs text-muted-foreground">
              {isLoadingEnv ? 'Lecture du fichier .env...' : 'Fichier .env lu et actif.'}
            </div>
          )}
        </div>
      </div>

      {/* Background Tasks & Decoupled Cron Worker Card */}
      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                <span>Planificateur de Tâches d&apos;Arrière-Plan &amp; Worker Découplé</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                    cronStatus?.dbConnected
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                      : 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30'
                  }`}
                >
                  {cronStatus?.dbConnected ? 'PostgreSQL Opérationnel' : 'PostgreSQL Déconnecté'}
                </span>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Surveillance de l&apos;infrastructure (Ping MikroTik 5m, Stocks 30m, Clôture 23h59). Mode autonome via{' '}
                <code className="font-mono text-[11px] bg-muted px-1.5 py-0.5 rounded">bun run worker:cron</code>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {cronFeedback && (
              <span className="text-xs font-semibold animate-in fade-in flex items-center gap-1 text-primary">
                {cronFeedback}
              </span>
            )}
            <button
              onClick={fetchCronStatus}
              className="px-3 py-1.5 rounded-xl border border-border hover:bg-muted text-xs font-medium transition flex items-center gap-1.5 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Actualiser Statut</span>
            </button>
          </div>
        </div>

        {/* Task Trigger Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => handleTriggerCronTask('ping_routers')}
            disabled={isTriggeringTask !== null}
            className="p-3.5 rounded-2xl border border-border bg-muted/40 hover:bg-muted text-left transition flex items-center justify-between gap-2 cursor-pointer disabled:opacity-50"
          >
            <div>
              <div className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-sky-500" />
                <span>Pinger les Routeurs MikroTik</span>
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                {cronStatus?.cron?.stats?.lastHealthCheck
                  ? `${cronStatus.cron.stats.lastHealthCheck.online} en ligne / ${cronStatus.cron.stats.lastHealthCheck.checked}`
                  : 'Cycle planifié toutes les 5m'}
              </div>
            </div>
            {isTriggeringTask === 'ping_routers' ? (
              <RefreshCw className="w-4 h-4 animate-spin text-primary" />
            ) : (
              <Play className="w-3.5 h-3.5 text-muted-foreground" />
            )}
          </button>

          <button
            type="button"
            onClick={() => handleTriggerCronTask('stock_check')}
            disabled={isTriggeringTask !== null}
            className="p-3.5 rounded-2xl border border-border bg-muted/40 hover:bg-muted text-left transition flex items-center justify-between gap-2 cursor-pointer disabled:opacity-50"
          >
            <div>
              <div className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                <span>Vérifier Stocks Critiques</span>
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                {cronStatus?.cron?.stats?.lastStockCheck
                  ? `${cronStatus.cron.stats.lastStockCheck.criticalCount} profil(s) alerte`
                  : 'Cycle planifié toutes les 30m'}
              </div>
            </div>
            {isTriggeringTask === 'stock_check' ? (
              <RefreshCw className="w-4 h-4 animate-spin text-primary" />
            ) : (
              <Play className="w-3.5 h-3.5 text-muted-foreground" />
            )}
          </button>

          <button
            type="button"
            onClick={() => handleTriggerCronTask('daily_closure')}
            disabled={isTriggeringTask !== null}
            className="p-3.5 rounded-2xl border border-border bg-muted/40 hover:bg-muted text-left transition flex items-center justify-between gap-2 cursor-pointer disabled:opacity-50"
          >
            <div>
              <div className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-500" />
                <span>Déclencher Clôture Test</span>
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                {cronStatus?.cron?.stats?.lastDailyClosure
                  ? 'Dernière clôture expédiée'
                  : 'Déclenchement automatique 23h59'}
              </div>
            </div>
            {isTriggeringTask === 'daily_closure' ? (
              <RefreshCw className="w-4 h-4 animate-spin text-primary" />
            ) : (
              <Play className="w-3.5 h-3.5 text-muted-foreground" />
            )}
          </button>
        </div>
      </div>

      {/* Grid: General Settings & PostgreSQL */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. General Settings */}
        <div className="rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#141416] p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-neutral-950 dark:text-white text-base flex items-center gap-2">
              <Globe className="h-4 w-4 text-neutral-800 dark:text-neutral-200" />
              <span>Paramètres Généraux & Établissement</span>
            </h3>
            <div className="flex items-center gap-2">
              {generalFeedback && (
                <span className="text-xs text-green-600 dark:text-green-400 font-medium animate-fade-in flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  {generalFeedback}
                </span>
              )}
              <button
                onClick={handleSaveGeneral}
                disabled={isSavingGeneral}
                className="px-3 py-1.5 rounded-full bg-black text-white dark:bg-white dark:text-black hover:opacity-85 text-xs font-medium transition flex items-center gap-1.5"
              >
                {isSavingGeneral ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                <span>Enregistrer</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">Nom Commercial</label>
              <input
                type="text"
                value={generalConfig.businessName}
                onChange={(e) => setGeneralConfig({ ...generalConfig, businessName: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">Devise Principale</label>
              <input
                type="text"
                value={generalConfig.currency}
                onChange={(e) => setGeneralConfig({ ...generalConfig, currency: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white font-mono"
              />
            </div>
            <div>
              <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">Fuseau Horaire</label>
              <input
                type="text"
                value={generalConfig.timezone}
                onChange={(e) => setGeneralConfig({ ...generalConfig, timezone: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white font-mono"
              />
            </div>
            <div>
              <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">Seuil Stock Critique (tickets)</label>
              <input
                type="number"
                value={generalConfig.lowStockThreshold}
                onChange={(e) => setGeneralConfig({ ...generalConfig, lowStockThreshold: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white font-mono"
              />
            </div>
          </div>
        </div>

        {/* 2. Database PostgreSQL Real Status */}
        <div className="rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#141416] p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-neutral-950 dark:text-white text-base flex items-center gap-2">
              <Database className="h-4 w-4 text-neutral-800 dark:text-neutral-200" />
              <span>Base de Données PostgreSQL Active</span>
            </h3>
            <button
              onClick={handleTestDatabase}
              disabled={isTestingDb}
              className="px-3 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-xs font-medium text-neutral-700 dark:text-neutral-300 transition flex items-center gap-1.5"
            >
              <RefreshCw className={`h-3 w-3 ${isTestingDb ? 'animate-spin' : ''}`} />
              <span>Tester la Connexion Directe</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2.5 text-xs">
            <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800">
              <div className="text-neutral-400 text-[10px]">Hôte & Port</div>
              <div className="font-mono font-medium text-neutral-800 dark:text-neutral-200">{dbState.host}:{dbState.port}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800">
              <div className="text-neutral-400 text-[10px]">Nom de la Base</div>
              <div className="font-mono font-medium text-neutral-800 dark:text-neutral-200">{dbState.databaseName}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800">
              <div className="text-neutral-400 text-[10px]">Utilisateur</div>
              <div className="font-mono font-medium text-neutral-800 dark:text-neutral-200">{dbState.username}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800">
              <div className="text-neutral-400 text-[10px]">Moteur ORM</div>
              <div className="font-medium text-neutral-950 dark:text-white">Drizzle ORM (15 tables)</div>
            </div>
          </div>

          {dbResult && (
            <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs flex items-center gap-2 animate-fade-in">
              <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
              <span>{dbResult}</span>
            </div>
          )}
        </div>
      </div>

      {/* Grid: SMTP Gateway & Telegram Interactive Console */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 3. Email Gateway (Resend API / SMTP) */}
        <div className="rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#141416] p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-neutral-950 dark:text-white text-base flex items-center gap-2">
              <Mail className="h-4 w-4 text-neutral-800 dark:text-neutral-200" />
              <span>Passerelle Email Transactionnelle</span>
            </h3>
            <div className="flex items-center gap-2">
              {smtpFeedback && (
                <span className="text-xs text-green-600 dark:text-green-400 font-medium animate-fade-in flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  {smtpFeedback}
                </span>
              )}
              <button
                onClick={handleTestSmtp}
                disabled={isTestingSmtp}
                className="px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-xs font-medium text-neutral-700 dark:text-neutral-300 transition flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className={`h-3 w-3 ${isTestingSmtp ? 'animate-spin' : ''}`} />
                <span>Tester</span>
              </button>
              <button
                onClick={handleSaveSmtp}
                disabled={isSavingSmtp}
                className="px-3 py-1 rounded-full bg-black text-white dark:bg-white dark:text-black hover:opacity-85 text-xs font-medium transition flex items-center gap-1 cursor-pointer"
              >
                {isSavingSmtp ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                <span>Enregistrer</span>
              </button>
            </div>
          </div>

          {/* Provider Toggle: Resend API vs SMTP */}
          <div className="flex items-center gap-2 p-1 rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs">
            <button
              type="button"
              onClick={() => setSmtpConfig({ ...smtpConfig, provider: 'resend' })}
              className={`flex-1 py-1.5 px-3 rounded-lg font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                smtpConfig.provider === 'resend'
                  ? 'bg-white dark:bg-neutral-800 text-neutral-950 dark:text-white shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>Resend API (SaaS Moderne)</span>
            </button>
            <button
              type="button"
              onClick={() => setSmtpConfig({ ...smtpConfig, provider: 'smtp' })}
              className={`flex-1 py-1.5 px-3 rounded-lg font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                smtpConfig.provider === 'smtp'
                  ? 'bg-white dark:bg-neutral-800 text-neutral-950 dark:text-white shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <Mail className="w-3.5 h-3.5 text-primary" />
              <span>Serveur SMTP Traditionnel</span>
            </button>
          </div>

          {smtpConfig.provider === 'resend' ? (
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Clé API Resend (RESEND_API_KEY)
                </label>
                <input
                  type="password"
                  placeholder="re_123456789abcdef..."
                  value={smtpConfig.resendApiKey}
                  onChange={(e) => setSmtpConfig({ ...smtpConfig, resendApiKey: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white font-mono"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Adresse Expéditeur (De)
                  </label>
                  <input
                    type="text"
                    placeholder="NetPulse <onboarding@resend.dev>"
                    value={smtpConfig.from}
                    onChange={(e) => setSmtpConfig({ ...smtpConfig, from: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Destinataire par Défaut
                  </label>
                  <input
                    type="text"
                    placeholder="direction@netpulse.lan"
                    value={Array.isArray(smtpConfig.recipients) ? smtpConfig.recipients[0] : smtpConfig.recipients}
                    onChange={(e) => setSmtpConfig({ ...smtpConfig, recipients: [e.target.value] })}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white"
                  />
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-[11px] flex items-center gap-2">
                <Zap className="w-4 h-4 shrink-0 text-amber-500" />
                <span>
                  Resend garantit 99.9% de délivrabilité sans blocage des ports 25/587 par les fournisseurs d&apos;accès Internet locaux.
                </span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="sm:col-span-2">
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">Serveur SMTP Hôte</label>
                <input
                  type="text"
                  placeholder="smtp.gmail.com"
                  value={smtpConfig.host}
                  onChange={(e) => setSmtpConfig({ ...smtpConfig, host: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white font-mono"
                />
              </div>
              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">Port</label>
                <input
                  type="number"
                  value={smtpConfig.port}
                  onChange={(e) => setSmtpConfig({ ...smtpConfig, port: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white font-mono"
                />
              </div>
              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">Email Expéditeur</label>
                <input
                  type="text"
                  placeholder="alerts@netpulse.lan"
                  value={smtpConfig.from}
                  onChange={(e) => setSmtpConfig({ ...smtpConfig, from: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">Nom d&apos;utilisateur</label>
                <input
                  type="text"
                  value={smtpConfig.user}
                  onChange={(e) => setSmtpConfig({ ...smtpConfig, user: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white font-mono"
                />
              </div>
              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">Mot de Passe App</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={smtpConfig.pass}
                  onChange={(e) => setSmtpConfig({ ...smtpConfig, pass: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white font-mono"
                />
              </div>
            </div>
          )}

          {smtpResult && (
            <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs flex items-center gap-2 animate-fade-in">
              <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
              <span>{smtpResult}</span>
            </div>
          )}
        </div>

        {/* Telegram Interactive Console */}
        <div className="rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#141416] p-5 shadow-sm space-y-4 flex flex-col justify-between">
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
          <div className="h-48 rounded-xl bg-neutral-900 dark:bg-neutral-950 border border-neutral-800 p-3 overflow-y-auto space-y-2 font-mono text-xs text-neutral-200">
            {telegramLogs.map((log, i) => (
              <div
                key={i}
                className={`p-2 rounded-xl max-w-[85%] whitespace-pre-wrap ${
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

          {/* Input & Quick Command Pills */}
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1">
              {['/status', '/ca', '/cleandisk', '/rapport_jour', '/cloture', '/alertes'].map((cmd) => (
                <button
                  key={cmd}
                  onClick={() => handleExecuteTelegramCommand(cmd)}
                  disabled={isSendingTelegram}
                  className="px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-mono text-[10px] transition"
                >
                  {cmd}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
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
                className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white font-mono focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
              />
              <button
                onClick={() => handleExecuteTelegramCommand(telegramCommand)}
                disabled={isSendingTelegram}
                className="px-3.5 py-1.5 rounded-xl bg-black hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-black text-xs font-medium transition flex items-center justify-center"
              >
                <Send className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Multi-Channel Alerting Hub & Webhooks */}
      <div className="rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#141416] p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-neutral-950 dark:text-white text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-neutral-800 dark:text-neutral-200" />
              <span>Passerelles &amp; Webhooks Multi-Canaux (Discord, Slack, WhatsApp)</span>
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Enregistrez vos webhooks et numéros de contact pour la diffusion des arrêtés de caisse et alertes d&apos;infrastructure.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {channelsFeedback && (
              <span className="text-xs text-green-600 dark:text-green-400 font-medium animate-fade-in flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                {channelsFeedback}
              </span>
            )}
            <button
              onClick={handleSaveChannels}
              disabled={isSavingChannels}
              className="px-3 py-1.5 rounded-full bg-black text-white dark:bg-white dark:text-black hover:opacity-85 text-xs font-medium transition flex items-center gap-1.5"
            >
              {isSavingChannels ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
              <span>Sauvegarder les Canaux</span>
            </button>
          </div>
        </div>

        {/* Multi-Choix des Bots & Canaux Actifs pour la diffusion */}
        <div className="p-4 rounded-2xl border border-border bg-muted/40 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="font-semibold text-xs text-foreground flex items-center gap-2">
                <Bot className="w-4 h-4 text-primary" />
                <span>Sélection Multi-Choix des Bots &amp; Canaux Actifs</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Cochez les bots qui recevront les alertes de stock critique et les clôtures de caisse automatiques
              </p>
            </div>
            <div className="flex items-center gap-2">
              {botsFeedback && (
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold animate-in fade-in flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  {botsFeedback}
                </span>
              )}
              <button
                type="button"
                onClick={handleSaveActiveBots}
                disabled={isSavingBots}
                className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground hover:opacity-90 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-60"
              >
                {isSavingBots ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>Enregistrer les Bots</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 pt-1">
            {[
              { key: 'telegram', label: 'Telegram Bot', badge: '✈️' },
              { key: 'discord', label: 'Discord Webhook', badge: '🎮' },
              { key: 'email', label: 'Resend / Email', badge: '✉️' },
              { key: 'slack', label: 'Slack Webhook', badge: '💬' },
              { key: 'whatsapp', label: 'WhatsApp', badge: '📱' },
            ].map((item) => {
              const isEnabled = Boolean((activeBots as any)[item.key]);
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() =>
                    setActiveBots((prev) => ({ ...prev, [item.key]: !isEnabled }))
                  }
                  className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 transition cursor-pointer text-xs ${
                    isEnabled
                      ? 'border-primary/40 bg-primary/10 text-foreground font-semibold shadow-xs'
                      : 'border-border text-muted-foreground hover:bg-muted opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span>{item.badge}</span>
                    <span className="truncate">{item.label}</span>
                  </div>
                  <div className="shrink-0">
                    {isEnabled ? (
                      <CheckSquare className="w-4 h-4 text-primary" />
                    ) : (
                      <Square className="w-4 h-4 text-muted-foreground/50" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* Discord */}
          <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-neutral-900 dark:text-white flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                <span>Discord Webhook</span>
              </span>
              <button
                type="button"
                onClick={() => handleTestChannel('discord')}
                className="px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:opacity-80 text-[10px] font-semibold"
              >
                Tester
              </button>
            </div>
            <input
              type="text"
              placeholder="https://discord.com/api/webhooks/..."
              value={channelConfigs.discordWebhookUrl}
              onChange={(e) => setChannelConfigs({ ...channelConfigs, discordWebhookUrl: e.target.value })}
              className="w-full px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white font-mono text-xs"
            />
            <p className="text-[10px] text-neutral-400">Embeds riches pour salons Discord de direction.</p>
          </div>

          {/* Slack */}
          <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-neutral-900 dark:text-white flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
                <span>Slack Incoming Webhook</span>
              </span>
              <button
                type="button"
                onClick={() => handleTestChannel('slack')}
                className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 hover:opacity-80 text-[10px] font-semibold"
              >
                Tester
              </button>
            </div>
            <input
              type="text"
              placeholder="https://hooks.slack.com/services/..."
              value={channelConfigs.slackWebhookUrl}
              onChange={(e) => setChannelConfigs({ ...channelConfigs, slackWebhookUrl: e.target.value })}
              className="w-full px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white font-mono text-xs"
            />
            <p className="text-[10px] text-neutral-400">Messages Block Kit interactifs pour espaces Slack.</p>
          </div>

          {/* WhatsApp */}
          <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-neutral-900 dark:text-white flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-green-500" />
                <span>WhatsApp (Twilio)</span>
              </span>
              <button
                type="button"
                onClick={() => handleTestChannel('whatsapp')}
                className="px-2 py-0.5 rounded bg-green-100 dark:bg-green-950/60 text-green-600 dark:text-green-400 hover:opacity-80 text-[10px] font-semibold"
              >
                Tester
              </button>
            </div>
            <input
              type="text"
              placeholder="+22890123456 (format E.164)"
              value={channelConfigs.whatsappNumber}
              onChange={(e) => setChannelConfigs({ ...channelConfigs, whatsappNumber: e.target.value })}
              className="w-full px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white font-mono text-xs"
            />
            <p className="text-[10px] text-neutral-400">Alertes critiques instantanées par WhatsApp.</p>
          </div>
        </div>
      </div>

      {/* 5. Automated Financial Reports & Triggers */}
      <div className="rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#141416] p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-neutral-950 dark:text-white text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-neutral-800 dark:text-neutral-200" />
              <span>Automatisation & Planification des Rapports</span>
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Planification des clôtures comptables, rapports périodiques et alertes matérielles
            </p>
          </div>
          <div className="flex items-center gap-2">
            {automationFeedback && (
              <span className="text-xs text-green-600 dark:text-green-400 font-medium animate-fade-in flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                {automationFeedback}
              </span>
            )}
            <button
              onClick={handleSaveAutomation}
              disabled={isSavingAutomation}
              className="px-3 py-1.5 rounded-full bg-black text-white dark:bg-white dark:text-black hover:opacity-85 text-xs font-medium transition flex items-center gap-1.5"
            >
              {isSavingAutomation ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
              <span>Sauvegarder l&apos;Automatisation</span>
            </button>
          </div>
        </div>

        {/* Toggles Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/40 dark:bg-neutral-900/30 flex items-center justify-between">
            <div>
              <div className="font-semibold text-neutral-900 dark:text-white">Rapport Journalier</div>
              <div className="text-[11px] text-neutral-400">Heure: {automationConfig.dailyReportTime || '23:59'}</div>
            </div>
            <input
              type="checkbox"
              checked={automationConfig.dailyReportEnabled}
              onChange={(e) => setAutomationConfig({ ...automationConfig, dailyReportEnabled: e.target.checked })}
              className="h-4 w-4 rounded accent-black dark:accent-white cursor-pointer"
            />
          </div>

          <div className="p-3 rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/40 dark:bg-neutral-900/30 flex items-center justify-between">
            <div>
              <div className="font-semibold text-neutral-900 dark:text-white">Alerte Clôture Caisse</div>
              <div className="text-[11px] text-neutral-400">Envoi immédiat au scellement</div>
            </div>
            <input
              type="checkbox"
              checked={automationConfig.closureIncomeAlertEnabled}
              onChange={(e) => setAutomationConfig({ ...automationConfig, closureIncomeAlertEnabled: e.target.checked })}
              className="h-4 w-4 rounded accent-black dark:accent-white cursor-pointer"
            />
          </div>

          <div className="p-3 rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/40 dark:bg-neutral-900/30 flex items-center justify-between">
            <div>
              <div className="font-semibold text-neutral-900 dark:text-white">Alerte Stock Critique</div>
              <div className="text-[11px] text-neutral-400">Seuil: &lt; {generalConfig.lowStockThreshold} tickets</div>
            </div>
            <input
              type="checkbox"
              checked={automationConfig.stockCriticalAlertEnabled}
              onChange={(e) => setAutomationConfig({ ...automationConfig, stockCriticalAlertEnabled: e.target.checked })}
              className="h-4 w-4 rounded accent-black dark:accent-white cursor-pointer"
            />
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
              onClick={() => handleTriggerTestReport('daily', 'all')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-900 text-white dark:bg-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200 text-xs font-semibold shadow-sm transition"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>🌐 Tester Multi-Canal (Tous)</span>
            </button>
            <button
              onClick={() => handleTriggerTestReport('daily', 'telegram')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-medium transition"
            >
              <Bot className="h-3.5 w-3.5" />
              <span>Tester Telegram</span>
            </button>
            <button
              onClick={() => handleTestChannel('discord')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-medium transition"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Tester Discord</span>
            </button>
            <button
              onClick={() => handleTestChannel('slack')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-medium transition"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Tester Slack</span>
            </button>
            <button
              onClick={() => handleTestChannel('whatsapp')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-medium transition"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Tester WhatsApp</span>
            </button>
            <button
              onClick={() => handleTriggerTestReport('daily', 'email')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-medium transition"
            >
              <Mail className="h-3.5 w-3.5" />
              <span>Tester Email</span>
            </button>
            <button
              onClick={() => handleTriggerTestReport('closure', 'all')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-medium transition"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Tester Clôture Caisse</span>
            </button>
            <button
              onClick={() => handleTriggerTestReport('stock_alert', 'all')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-medium transition"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Tester Alerte Stock</span>
            </button>
          </div>
        </div>
      </div>

      {/* 6. Notification Logs Audit Trail */}
      <div className="rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#141416] p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-neutral-950 dark:text-white text-base flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-neutral-800 dark:text-neutral-200" />
              <span>Journal d&apos;Audit des Notifications & Alertes Expédiées</span>
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Traçabilité en temps réel des envois automatiques et manuels (Telegram, Discord, Slack, WhatsApp & Email)
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
                <th className="p-2.5">Date & Heure</th>
                <th className="p-2.5">Type d&apos;Alerte</th>
                <th className="p-2.5">Canal</th>
                <th className="p-2.5">Destinataire</th>
                <th className="p-2.5">Titre</th>
                <th className="p-2.5 text-right">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200/60 dark:divide-neutral-800">
              {notificationLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-neutral-400">
                    Aucun journal d&apos;envoi enregistré pour le moment.
                  </td>
                </tr>
              ) : (
                notificationLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-900/40 transition">
                    <td className="p-2.5 font-mono text-[11px] text-neutral-500">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="p-2.5 font-medium text-neutral-800 dark:text-neutral-200">
                      {log.type}
                    </td>
                    <td className="p-2.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                        {log.channel}
                      </span>
                    </td>
                    <td className="p-2.5 font-mono text-[11px] text-neutral-600 dark:text-neutral-400 truncate max-w-[140px]">
                      {log.recipient}
                    </td>
                    <td className="p-2.5 text-neutral-700 dark:text-neutral-300 truncate max-w-[200px]">
                      {log.title}
                    </td>
                    <td className="p-2.5 text-right">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          log.status === 'delivered'
                            ? 'bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-400'
                            : log.status === 'sent'
                            ? 'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400'
                            : 'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400'
                        }`}
                      >
                        {log.status === 'delivered' ? 'Délivré' : log.status === 'sent' ? 'Expédié' : 'Échoué'}
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
