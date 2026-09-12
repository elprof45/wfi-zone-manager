'use client';

import { useState } from 'react';
import {
    Send,
    Mail,
    CheckCircle2,
    AlertCircle,
    RefreshCw,
    X,
    Sparkles,
    Check
} from 'lucide-react';
import { type NotificationChannel } from '@/lib/notifications';

interface TelegramEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultReportType?: 'daily' | 'weekly' | 'monthly' | 'closure' | 'stock_alert';
  currency: string;
}

const AVAILABLE_CHANNELS: Array<{
  id: NotificationChannel;
  label: string;
  badge: string;
  color: string;
}> = [
  { id: 'telegram', label: 'Telegram Bot', badge: '✈️', color: 'border-sky-500/40 bg-sky-500/10 text-sky-600 dark:text-sky-400' },
  { id: 'discord', label: 'Discord HTTP Bot', badge: '🎮', color: 'border-indigo-500/40 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' },
  { id: 'email', label: 'Resend / Email', badge: '✉️', color: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
];

export function TelegramEmailModal({
  isOpen,
  onClose,
  defaultReportType = 'daily',
  currency,
}: TelegramEmailModalProps) {
  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly' | 'closure' | 'stock_alert'>(defaultReportType);
  const [selectedChannels, setSelectedChannels] = useState<NotificationChannel[]>(['telegram', 'email', 'discord']);
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

  const toggleChannel = (ch: NotificationChannel) => {
    setSelectedChannels((prev) =>
      prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]
    );
  };

  const selectAllChannels = () => {
    setSelectedChannels(['telegram', 'discord', 'email']);
  };

  const handleSend = async () => {
    if (selectedChannels.length === 0) {
      setResult({
        success: false,
        message: 'Veuillez sélectionner au moins un canal ou bot de diffusion.',
      });
      return;
    }

    setIsSending(true);
    setResult(null);
    try {
      const res = await fetch('/api/reports/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportType,
          channels: selectedChannels,
          recipientEmail,
          customNotes,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setResult({
          success: true,
          message: data.message || 'Rapport expédié avec succès sur les canaux sélectionnés !',
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-xl rounded-3xl bg-card border border-border p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-foreground text-base">
                Expédition Instantanée Multi-Bots &amp; Canaux
              </h3>
              <p className="text-xs text-muted-foreground">
                Sélectionnez les bots et destinataires pour la diffusion du rapport
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1.5 rounded-xl transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="space-y-4 text-xs">
          {/* Type of Report */}
          <div>
            <label className="block text-foreground font-semibold mb-1.5">
              Type de Rapport à Générer
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
                  className={`p-2.5 rounded-2xl border text-left transition cursor-pointer ${
                    reportType === item.id
                      ? 'border-primary bg-primary/10 text-primary font-semibold shadow-xs'
                      : 'border-border text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <div className="font-semibold truncate">{item.label}</div>
                  <div className="text-[10px] opacity-75 truncate">{item.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Multi-Channel Bot Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-foreground font-semibold">
                Sélection Multi-Choix des Bots &amp; Canaux
              </label>
              <button
                type="button"
                onClick={selectAllChannels}
                className="text-[11px] font-medium text-primary hover:underline cursor-pointer"
              >
                Tout sélectionner
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {AVAILABLE_CHANNELS.map((ch) => {
                const isSelected = selectedChannels.includes(ch.id);
                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => toggleChannel(ch.id)}
                    className={`p-2.5 rounded-2xl border flex items-center justify-between gap-2 transition cursor-pointer text-xs ${
                      isSelected
                        ? `${ch.color} font-semibold shadow-xs`
                        : 'border-border text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-base">{ch.badge}</span>
                      <span className="truncate">{ch.label}</span>
                    </div>
                    <div
                      className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] shrink-0 border ${
                        isSelected
                          ? 'border-current bg-current/20'
                          : 'border-muted-foreground/30'
                      }`}
                    >
                      {isSelected && <Check className="w-2.5 h-2.5" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Email Recipient Input (if email channel is selected) */}
          {selectedChannels.includes('email') && (
            <div className="p-3 rounded-2xl border border-border bg-muted/30 space-y-1.5 animate-in fade-in">
              <div className="flex items-center gap-1.5 font-semibold text-foreground text-xs">
                <Mail className="w-3.5 h-3.5 text-primary" />
                <span>Destinataires Email (séparés par des virgules)</span>
              </div>
              <input
                type="text"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="direction@netpulse.lan, finance@netpulse.lan"
                className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
              />
            </div>
          )}

          {/* Optional Notes */}
          <div>
            <label className="block text-foreground font-semibold mb-1">
              Note Manuelle d&apos;Accompagnement (Optionnel)
            </label>
            <textarea
              rows={2}
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
              placeholder="Ex: Clôture intermédiaire suite à changement de shift caissier..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Result Alert */}
          {result && (
            <div
              className={`p-3 rounded-2xl border text-xs flex items-start gap-2.5 animate-in fade-in ${
                result.success
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                  : 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300'
              }`}
            >
              {result.success ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
              )}
              <div className="space-y-1">
                <div className="font-semibold">{result.message}</div>
                {result.emailSubject && (
                  <div className="text-[10px] opacity-80 truncate">Sujet : {result.emailSubject}</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 border-t border-border pt-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-border text-muted-foreground hover:text-foreground text-xs font-medium transition cursor-pointer"
          >
            Fermer
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={isSending || selectedChannels.length === 0}
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.98] text-xs font-semibold transition flex items-center gap-1.5 shadow-sm disabled:opacity-60 cursor-pointer"
          >
            {isSending ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            <span>
              {isSending ? 'Expédition en cours...' : `Diffuser sur ${selectedChannels.length} canal(ux)`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
