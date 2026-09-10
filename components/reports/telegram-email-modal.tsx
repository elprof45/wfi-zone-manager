'use client';

import React, { useState } from 'react';
import {
  Send,
  Bot,
  Mail,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
  Sparkles,
} from 'lucide-react';

interface TelegramEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultReportType?: 'daily' | 'weekly' | 'monthly' | 'closure' | 'stock_alert';
  currency: string;
}

export function TelegramEmailModal({
  isOpen,
  onClose,
  defaultReportType = 'daily',
  currency,
}: TelegramEmailModalProps) {
  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly' | 'closure' | 'stock_alert'>(defaultReportType);
  const [channel, setChannel] = useState<'all' | 'telegram' | 'email' | 'discord' | 'slack' | 'whatsapp' | 'both'>('all');
  const [recipientEmail, setRecipientEmail] = useState('direction@netpulse.lan, comptabilite@netpulse.lan');
  const [customNotes, setCustomNotes] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    telegramText?: string;
    emailSubject?: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleSend = async () => {
    setIsSending(true);
    setResult(null);
    try {
      const res = await fetch('/api/reports/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportType,
          channel,
          recipientEmail,
          customNotes,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setResult({
          success: true,
          message: data.message || 'Rapport expédié avec succès !',
          telegramText: data.telegramText,
          emailSubject: data.emailSubject,
        });
      } else {
        setResult({
          success: false,
          message: data.error || 'Erreur lors de l’expédition du rapport.',
        });
      }
    } catch {
      setResult({
        success: false,
        message: 'Erreur réseau lors de la communication avec la passerelle d’alertes.',
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#141416] border border-black/[0.08] dark:border-white/[0.1] p-6 shadow-2xl space-y-5 animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white">
              <Bot className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-semibold text-neutral-950 dark:text-white text-base">
                Expédition Instantanée de Rapport (2026)
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Bot Telegram & Passerelle Email SMTP automatisés
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-900 dark:hover:text-white p-1 rounded-lg transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Form */}
        <div className="space-y-4 text-xs">
          {/* Report Type Selector */}
          <div>
            <label className="block text-neutral-700 dark:text-neutral-300 font-medium mb-1.5">
              Type de Rapport à Expédier
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'daily', label: 'Journalier', desc: 'Ventes du jour' },
                { id: 'weekly', label: 'Hebdomadaire', desc: '7 derniers jours' },
                { id: 'monthly', label: 'Mensuel', desc: 'Recettes 30j' },
                { id: 'closure', label: 'Incomes Caisse', desc: 'Arrêté scellé' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setReportType(item.id as any)}
                  className={`p-2.5 rounded-xl border text-left transition ${
                    reportType === item.id
                      ? 'border-neutral-950 dark:border-white bg-neutral-100 dark:bg-neutral-800 text-neutral-950 dark:text-white font-medium'
                      : 'border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-900'
                  }`}
                >
                  <div className="font-semibold truncate">{item.label}</div>
                  <div className="text-[10px] text-neutral-400 truncate">{item.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Channel Selector */}
          <div>
            <label className="block text-neutral-700 dark:text-neutral-300 font-medium mb-1.5">
              Canal de Diffusion
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { id: 'all', label: '🌐 Tous les canaux', icon: Sparkles },
                { id: 'telegram', label: '✈️ Telegram', icon: Bot },
                { id: 'discord', label: '🎮 Discord', icon: Sparkles },
                { id: 'slack', label: '💬 Slack', icon: Sparkles },
                { id: 'whatsapp', label: '📱 WhatsApp', icon: Sparkles },
                { id: 'email', label: '✉️ Email', icon: Mail },
              ].map((ch) => {
                const Icon = ch.icon;
                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => setChannel(ch.id as any)}
                    className={`p-2.5 rounded-xl border flex items-center justify-center gap-1.5 transition text-xs ${
                      channel === ch.id
                        ? 'border-neutral-950 dark:border-white bg-neutral-100 dark:bg-neutral-800 text-neutral-950 dark:text-white font-semibold'
                        : 'border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-900'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{ch.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Email Recipient Input (if email enabled or all channels) */}
          {(channel === 'email' || channel === 'both' || channel === 'all') && (
            <div>
              <label className="block text-neutral-700 dark:text-neutral-300 font-medium mb-1">
                Destinataires Email (séparés par des virgules)
              </label>
              <input
                type="text"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="direction@netpulse.lan, comptabilite@netpulse.lan"
                className="w-full p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
              />
            </div>
          )}

          {/* Custom Notes / Annotation */}
          <div>
            <label className="block text-neutral-700 dark:text-neutral-300 font-medium mb-1">
              Annotation Personnalisée (Optionnel)
            </label>
            <input
              type="text"
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
              placeholder="ex: Rapport certifié pour réunion de gestion du lundi matin."
              className="w-full p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
            />
          </div>

          {/* Feedback message */}
          {result && (
            <div
              className={`p-3.5 rounded-xl border text-xs space-y-1.5 animate-fade-in ${
                result.success
                  ? 'bg-neutral-50 dark:bg-neutral-900 border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200'
              }`}
            >
              <div className="flex items-center gap-2 font-medium">
                {result.success ? (
                  <CheckCircle2 className="h-4 w-4 text-neutral-950 dark:text-white shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />
                )}
                <span>{result.message}</span>
              </div>
              {result.telegramText && (
                <div className="text-[11px] text-neutral-500 dark:text-neutral-400 pt-1 border-t border-neutral-200 dark:border-neutral-800 line-clamp-3 font-mono">
                  {result.telegramText}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-full border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs font-medium transition"
          >
            Fermer
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={isSending}
            className="flex items-center gap-2 px-5 py-2 rounded-full bg-black hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-black text-xs font-medium transition shadow-sm disabled:opacity-40"
          >
            {isSending ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>Expédition en cours...</span>
              </>
            ) : (
              <>
                <Send className="h-3.5 w-3.5" />
                <span>Déclencher l&apos;Envoi Immédiat</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
