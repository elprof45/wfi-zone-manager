'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
    Sparkles,
    Send,
    Bot,
    User,
    RotateCcw,
    Copy,
    Check,
    Cpu,
    Shield,
    DollarSign,
    Code2,
    Sliders,
    Info,
    Terminal,
    Zap,
    Activity,
    PackageSearch,
    MessageCircle
} from 'lucide-react';
import type { NavigationSection } from '@/components/sidebar';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  modelUsed?: string;
}

interface AssistantViewProps {
  networkMetrics?: {
    routersCount: number;
    activeUsersCount: number;
    todayRevenue: number;
    currency: string;
    cpuAverage: number;
    ticketsSoldCount: number;
  };
  onNavigate?: (section: NavigationSection) => void;
  onRefreshData?: () => void;
}

interface RoleConfig {
  id: string;
  name: string;
  subtitle: string;
  icon: any;
  defaultModel: string;
  systemInstruction: string;
  suggestions: string[];
}

const ROLES: RoleConfig[] = [
  {
    id: 'network-expert',
    name: 'Expert Core Network MikroTik',
    subtitle: 'RouterOS v7, queues PCQ, protection CPU & Wi-Fi',
    icon: Cpu,
    defaultModel: 'gemini-3.8-flash',
    systemInstruction:
      'Tu es un Architecte Réseau Senior et Expert Core Network MikroTik certifié (MTCNA, MTCRE, MTCWE). Tu assistes l\'administrateur du système SaaS NetPulse Hotspot Manager (v2026). Tu fournis des explications claires et des scripts RouterOS v7 syntaxiquement exacts. Tu insistes toujours sur le découplage de la charge CPU des modèles d\'entrée de gamme (comme le RB951Ui avec 128 Mo de RAM) pour éviter les saturations de mémoire NAND et les crashs de queues simples.',
    suggestions: [
      'Comment optimiser les queues PCQ pour 100 utilisateurs sur un RB951Ui ?',
      'Script RouterOS pour purger les sessions Hotspot inactives de plus de 15 min',
      'Générer la configuration FastTrack et pare-feu pour sécuriser le hotspot',
      'Diagnostiquer une latence anormale sur l\'interface Wi-Fi 2.4GHz',
    ],
  },
  {
    id: 'financial-auditor',
    name: 'Auditeur Comptable & Caisse',
    subtitle: 'Ventes, clôtures journalières & optimisation des tarifs',
    icon: DollarSign,
    defaultModel: 'gemini-3.5-flash',
    systemInstruction:
      'Tu es un Auditeur Financier et Contrôleur de Gestion spécialisé dans la rentabilité des points d\'accès Hotspot Wi-Fi monétisés. Tu aides l\'exploitant à analyser son chiffre d\'affaires journalier, à réconcilier les encaissements physiques avec les fiches générées et à identifier les heures d\'affluence et les profils les plus rentables.',
    suggestions: [
      'Analyser mes ventes du jour et calculer le panier moyen par utilisateur',
      'Recommandations de tarification pour des forfaits 1h, 1 jour et 1 semaine',
      'Protocole de vérification en cas d\'écart de caisse lors de la clôture',
      'Comment limiter la fraude lors de la distribution physique des tickets ?',
    ],
  },
  {
    id: 'fast-troubleshoot',
    name: 'Support Rapide & Diagnostic',
    subtitle: 'Assistance immédiate pour gérants et clients bloqués',
    icon: Zap,
    defaultModel: 'gemini-3.1-flash-lite',
    systemInstruction:
      'Tu es un Agent de Support Technique Réseau de niveau 2 pour les gérants de points de vente Hotspot. Tu réponds de manière très concise, directe et méthodique pour résoudre en quelques secondes les pannes de connexion des clients ou les problèmes de portail captif.',
    suggestions: [
      'Client bloqué : "You are already logged in". Quelle commande MikroTik exécuter ?',
      'Le portail captif ne s\'affiche pas sur iPhone / iOS. Causes et correctifs ?',
      'Un ticket expire immédiatement après première connexion, d\'où vient le souci ?',
      'Vérifier si le serveur DHCP du Hotspot n\'a plus d\'adresses IP libres',
    ],
  },
  {
    id: 'scripting-automation',
    name: 'Ingénieur Automatisation & API',
    subtitle: 'Scripts RouterOS complexes, tâches cron & webhooks',
    icon: Code2,
    defaultModel: 'gemini-3.1-pro-preview',
    systemInstruction:
      'Tu es un Ingénieur DevNet et Spécialiste de l\'API MikroTik (Socket binaire 8728 et REST RouterOS v7). Tu rédiges du code complexe, des scripts RouterOS robustes avec gestion des exceptions, des requêtes API et des automatisations de maintenance nocturne.',
    suggestions: [
      'Script /system script pour sauvegarder la config et envoyer un webhook Telegram',
      'Règle mangle RouterOS pour router le trafic streaming vers une passerelle dédiée',
      'Comment implémenter un basculement WAN automatique (Failover avec Netwatch) ?',
      'Script d\'auto-nettoyage de la mémoire /file et des logs système',
    ],
  },
];

const MODELS = [
  {
    id: 'gemini-3.8-flash',
    name: 'Gemini 3.8 Flash',
    badge: 'Recommandé',
    description: 'Modèle rapide, intelligent et équilibré pour le hotspot',
  },
  {
    id: 'gemini-3.5-flash',
    name: 'Gemini 3.5 Flash',
    badge: 'Standard',
    description: 'Tâches générales d\'analyse et rédaction',
  },
  {
    id: 'gemini-3.1-flash-lite',
    name: 'Gemini 3.1 Flash Lite',
    badge: 'Ultra-rapide',
    description: 'Latence minimale pour diagnostics immédiats',
  },
  {
    id: 'gemini-3.1-pro-preview',
    name: 'Gemini 3.1 Pro',
    badge: 'Raisonnement avancé',
    description: 'Architecture réseau complexe et scripts RouterOS critiques',
  },
];

export function AssistantView({ networkMetrics, onNavigate, onRefreshData }: AssistantViewProps) {
  const [selectedRole, setSelectedRole] = useState<RoleConfig>(ROLES[0]);
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3.8-flash');
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [actionState, setActionState] = useState<string | null>(null);
  const [pendingTool, setPendingTool] = useState<{ action: string; plan: string; message: string } | null>(null);
  const [toolHistory, setToolHistory] = useState<Array<{ action: string; message: string; createdAt?: string }>>([]);
  const [availableTools, setAvailableTools] = useState<Array<{ id: string; label: string; mode: string; description: string }>>([]);
  const [liveContext, setLiveContext] = useState<{ generatedAt: string; routers: Array<{ name: string; status: string }>; sales?: { daily?: { totalRevenue: number; ticketsCount: number; currency: string } } } | null>(null);

  useEffect(() => {
    fetch('/api/assistant/actions')
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (data?.tools) setAvailableTools(data.tools);
        if (data?.history) {
          setToolHistory(data.history.map((entry: { entityId?: string; metadata?: { message?: string }; createdAt?: string }) => ({
            action: entry.entityId || 'assistant.tool',
            message: entry.metadata?.message || 'Exécution enregistrée',
            createdAt: entry.createdAt,
          })));
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    let active = true;
    const loadContext = async () => {
      const response = await fetch('/api/assistant/context');
      if (response.ok) {
        const data = await response.json();
        if (active) setLiveContext(data);
      }
    };
    void loadContext();
    const interval = window.setInterval(loadContext, 60_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  const runAssistantAction = async (action: 'router_health' | 'stock_check') => {
    setActionState(action);
    try {
      const response = await fetch('/api/assistant/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, mode: 'preview' }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Prévisualisation impossible.');
      setPendingTool({ action, plan: data.plan, message: data.message });
      setMessages((prev) => [...prev, {
        id: `preview-${action}-${Date.now()}`,
        role: 'assistant',
        content: `**Prévisualisation outil :** ${data.message}\n\nConfirmez l’exécution pour continuer.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
    } catch {
      setMessages((prev) => [...prev, {
        id: `action-error-${Date.now()}`,
        role: 'assistant',
        content: '**Action impossible :** le serveur ne répond pas.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
    } finally {
      setActionState(null);
    }
  };

  const confirmAssistantTool = async () => {
    if (!pendingTool) return;
    setActionState(pendingTool.action);
    try {
      const response = await fetch('/api/assistant/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: pendingTool.action, mode: 'execute', confirmationToken: pendingTool.plan }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Exécution impossible.');
      setMessages((prev) => [...prev, {
        id: `executed-${pendingTool.action}-${Date.now()}`,
        role: 'assistant',
        content: `**Outil exécuté :** ${data.message}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
      setToolHistory((prev) => [{ action: pendingTool.action, message: data.message, createdAt: new Date().toISOString() }, ...prev].slice(0, 10));
      onRefreshData?.();
      setPendingTool(null);
    } catch (error) {
      setMessages((prev) => [...prev, {
        id: `action-error-${Date.now()}`,
        role: 'assistant',
        content: `**Action refusée :** ${error instanceof Error ? error.message : 'Erreur inconnue.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
    } finally {
      setActionState(null);
    }
  };

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-msg',
      role: 'assistant',
      content: `Bonjour ! Je suis votre **Assistant IA NetPulse (v2026)**, configuré en tant que **${selectedRole.name}**.\n\nJe peux vous assister pour :\n- La configuration fine de **RouterOS v7** et la protection matérielle de vos routeurs (ex: RB951Ui),\n- La gestion des **queues de bande passante** et l'optimisation des profils Hotspot,\n- L'analyse de vos **ventes et clôtures comptables**,\n- La rédaction de **scripts d'automatisation** MikroTik.\n\nPosez-moi une question ou choisissez une suggestion ci-dessous.`,
      timestamp: '10:00',
      modelUsed: selectedModel,
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleRoleChange = (role: RoleConfig) => {
    setSelectedRole(role);
    setSelectedModel(role.defaultModel);
    // Add a system notice message in thread
    setMessages((prev) => [
      ...prev,
      {
        id: 'role-switch-' + Date.now(),
        role: 'assistant',
        content: `*Rôle actif basculé vers : **${role.name}***\n*Modèle recommandé activé : \`${role.defaultModel}\`*\n\n${role.subtitle}. Comment puis-je vous aider ?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: role.defaultModel,
      },
    ]);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isLoading) return;

    const userMessage: ChatMessage = {
      id: 'user-' + Date.now(),
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Format history for multi-turn Gemini API
      // Filter out purely informational role-switch messages or map role properly
      const historyForApi = newMessages
        .filter((m) => m.id !== 'welcome-msg' || m.role === 'assistant')
        .map((m) => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.content,
        }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: historyForApi,
          model: selectedModel,
          systemInstruction: selectedRole.systemInstruction,
          networkContext: networkMetrics,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la génération de la réponse.');
      }

      const assistantMessage: ChatMessage = {
        id: 'assistant-' + Date.now(),
        role: 'assistant',
        content: data.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: data.model || selectedModel,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: 'error-' + Date.now(),
          role: 'assistant',
          content: `⚠️ **Erreur :** ${err.message || 'Impossible de contacter l\'API Gemini.'}\n\n*Assurez-vous que la variable \`GEMINI_API_KEY\` est configurée dans votre environnement.*`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: 'welcome-reset-' + Date.now(),
        role: 'assistant',
        content: `Historique de conversation réinitialisé. Je suis prêt avec le rôle **${selectedRole.name}** (\`${selectedModel}\`).`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: selectedModel,
      },
    ]);
  };

  const handleCopy = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Helper to render markdown blocks nicely with copy for code blocks
  const renderFormattedMessage = (content: string, messageId: string) => {
    const parts = content.split(/(```[\s\S]*?```)/g);

    return (
      <div className="space-y-3 leading-relaxed text-[13.5px]">
        {parts.map((part, index) => {
          if (part.startsWith('```') && part.endsWith('```')) {
            const firstLineBreak = part.indexOf('\n');
            const lang = part.substring(3, firstLineBreak).trim() || 'mikrotik';
            const code = part.substring(firstLineBreak + 1, part.length - 3).trim();
            const blockId = `${messageId}-code-${index}`;

            return (
              <div
                key={index}
                className="my-3 rounded-xl border border-neutral-800 bg-neutral-950 overflow-hidden text-xs text-neutral-200"
              >
                <div className="flex items-center justify-between px-3.5 py-2 border-b border-neutral-800/80 bg-neutral-900/60">
                  <div className="flex items-center gap-2 font-mono text-[11px] text-neutral-400">
                    <Terminal className="h-3 w-3 text-neutral-400" />
                    <span>{lang}</span>
                  </div>
                  <button
                    onClick={() => handleCopy(code, blockId)}
                    className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
                  >
                    {copiedId === blockId ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-400" />
                        <span className="text-emerald-400">Copié</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Copier</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-3.5 overflow-x-auto font-mono text-[12px] leading-relaxed text-neutral-100 selection:bg-neutral-800">
                  <code>{code}</code>
                </pre>
              </div>
            );
          }

          // Format paragraphs, bold, inline code, lists
          const paragraphs = part.split('\n\n');
          return (
            <React.Fragment key={index}>
              {paragraphs.map((para, pIdx) => {
                if (!para.trim()) return null;

                const lines = para.split('\n');
                return (
                  <div key={pIdx} className="space-y-1">
                    {lines.map((line, lIdx) => {
                      // Bullet points
                      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
                        return (
                          <div key={lIdx} className="flex items-start gap-2 pl-2">
                            <span className="text-neutral-400 mt-1">•</span>
                            <span
                              dangerouslySetInnerHTML={{
                                __html: formatInlineMarkdown(line.trim().substring(2)),
                              }}
                            />
                          </div>
                        );
                      }

                      // Numbered lists
                      const numMatch = line.trim().match(/^(\d+)\.\s+(.*)$/);
                      if (numMatch) {
                        return (
                          <div key={lIdx} className="flex items-start gap-2 pl-2">
                            <span className="text-neutral-400 font-mono text-xs mt-0.5">{numMatch[1]}.</span>
                            <span
                              dangerouslySetInnerHTML={{
                                __html: formatInlineMarkdown(numMatch[2]),
                              }}
                            />
                          </div>
                        );
                      }

                      return (
                        <p
                          key={lIdx}
                          dangerouslySetInnerHTML={{
                            __html: formatInlineMarkdown(line),
                          }}
                        />
                      );
                    })}
                  </div>
                );
              })}
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  const formatInlineMarkdown = (text: string) => {
    const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

    return escaped
      // Bold
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-neutral-950 dark:text-white">$1</strong>')
      // Italic
      .replace(/\*(.*?)\*/g, '<em class="italic text-neutral-600 dark:text-neutral-400">$1</em>')
      // Inline code
      .replace(
        /`([^`]+)`/g,
        '<code class="px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-200 font-mono text-[11.5px] border border-neutral-200/60 dark:border-neutral-700/60">$1</code>'
      );
  };

  return (
    <div id="gemini-assistant-view" className="space-y-4">
      {/* Header with Title and Quick Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span>Assistant IA Multi-Tours Gemini</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Supervision intelligente, diagnostic RouterOS, audit de caisse et génération de scripts
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Clear button */}
          <button
            onClick={handleClearHistory}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-foreground hover:bg-muted text-xs font-medium transition"
            title="Effacer l'historique de la conversation"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Nouvelle conversation</span>
          </button>
        </div>
      </div>

      <div className="app-surface rounded-2xl p-3 sm:p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <p className="text-xs font-semibold text-foreground">Actions opérationnelles</p>
            <p className="text-[11px] text-muted-foreground">Fonctions autorisées, exécutées côté serveur avec contrôle admin.</p>
          </div>
          <Zap className="h-4 w-4 text-primary shrink-0" />
        </div>
        {liveContext && (
          <div className="mb-3 grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-xl border border-border bg-muted/60 p-2.5 text-[10px]">
            <span><strong className="text-foreground">Routeurs</strong><br />{liveContext.routers.filter((router) => router.status === 'online').length}/{liveContext.routers.length} en ligne</span>
            <span><strong className="text-foreground">CA jour</strong><br />{liveContext.sales?.daily?.totalRevenue?.toLocaleString() || 0} {liveContext.sales?.daily?.currency || networkMetrics?.currency || 'FCFA'}</span>
            <span><strong className="text-foreground">Tickets jour</strong><br />{liveContext.sales?.daily?.ticketsCount || 0}</span>
            <span><strong className="text-foreground">Sync</strong><br />{new Date(liveContext.generatedAt).toLocaleTimeString('fr-FR')}</span>
          </div>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button type="button" onClick={() => runAssistantAction('router_health')} disabled={Boolean(actionState)} className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-muted px-3 py-2.5 text-[11px] font-semibold text-foreground hover:bg-accent disabled:opacity-50">
            <Activity className="h-3.5 w-3.5 text-primary" /> Santé réseau
          </button>
          <button type="button" onClick={() => runAssistantAction('stock_check')} disabled={Boolean(actionState)} className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-muted px-3 py-2.5 text-[11px] font-semibold text-foreground hover:bg-accent disabled:opacity-50">
            <PackageSearch className="h-3.5 w-3.5 text-primary" /> Vérifier stock
          </button>
          <button type="button" onClick={onRefreshData} className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-muted px-3 py-2.5 text-[11px] font-semibold text-foreground hover:bg-accent">
            <RotateCcw className="h-3.5 w-3.5 text-primary" /> Actualiser
          </button>
          <button type="button" onClick={() => onNavigate?.('monitoring')} className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-muted px-3 py-2.5 text-[11px] font-semibold text-foreground hover:bg-accent">
            <Terminal className="h-3.5 w-3.5 text-primary" /> Monitoring
          </button>
        </div>
        {availableTools.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {availableTools.map((tool) => (
              <span key={tool.id} title={tool.description} className="rounded-md border border-border px-2 py-1 text-[10px] text-muted-foreground">
                {tool.label} · {tool.mode}
              </span>
            ))}
          </div>
        )}
        {pendingTool && (
          <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 p-3">
            <div className="text-[11px] text-foreground">
              <span className="font-semibold">Confirmation requise.</span> {pendingTool.message}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button type="button" onClick={() => setPendingTool(null)} className="rounded-lg border border-border px-3 py-2 text-[11px] font-semibold text-muted-foreground hover:bg-muted">Annuler</button>
              <button type="button" onClick={confirmAssistantTool} disabled={Boolean(actionState)} className="rounded-lg bg-primary px-3 py-2 text-[11px] font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50">Confirmer</button>
            </div>
          </div>
        )}
        {toolHistory.length > 0 && (
          <div className="mt-3 border-t border-border pt-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Historique outils</p>
            <div className="flex gap-2 overflow-x-auto">
              {toolHistory.map((entry, index) => (
                <span key={`${entry.action}-${index}`} className="shrink-0 rounded-lg border border-border bg-muted px-2.5 py-1.5 text-[10px] text-foreground">{entry.action} · {entry.message}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Configuration Bar: Role selection & Model selection */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Active Role Selector */}
        <div className="md:col-span-2 app-surface rounded-2xl p-3.5 shadow-sm">
          <div className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Shield className="h-3 w-3" />
            <span>Rôle Spécialisé & Instructions Système</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {ROLES.map((role) => {
              const Icon = role.icon;
              const isSelected = selectedRole.id === role.id;
              return (
                <button
                  key={role.id}
                  onClick={() => handleRoleChange(role)}
                  className={`flex flex-col items-start text-left p-2.5 rounded-xl border transition ${
                    isSelected
                      ? 'border-neutral-950 dark:border-white bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 shadow-sm'
                      : 'border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                  }`}
                >
                  <Icon className={`h-4 w-4 mb-1.5 ${isSelected ? 'text-white dark:text-neutral-950' : 'text-neutral-500'}`} />
                  <div className="font-semibold text-xs leading-tight line-clamp-1">{role.name}</div>
                  <div className={`text-[10px] mt-0.5 line-clamp-1 ${isSelected ? 'text-neutral-300 dark:text-neutral-600' : 'text-neutral-400'}`}>
                    {role.defaultModel}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Model Selector Card */}
        <div className="app-surface rounded-2xl p-3.5 shadow-sm flex flex-col justify-between">
          <div className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sliders className="h-3 w-3" />
              <span>Modèle Gemini</span>
            </div>
            <span className="text-[10px] text-neutral-400 font-mono">2026 API</span>
          </div>

          <div className="space-y-1.5">
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full text-xs font-mono font-medium rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-950 dark:text-white px-3 py-2 focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
            >
              {MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.badge})
                </option>
              ))}
            </select>
            <div className="text-[11px] text-neutral-500 dark:text-neutral-400 px-1 pt-0.5">
              {MODELS.find((m) => m.id === selectedModel)?.description}
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Thread Container */}
      <div className="app-surface rounded-2xl shadow-sm flex flex-col h-[min(620px,calc(100dvh-14rem))] min-h-[460px] overflow-hidden">
        {/* Chat Thread Area (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {messages.map((message) => {
            const isUser = message.role === 'user';
            return (
              <div
                key={message.id}
                className={`flex gap-3 max-w-[90%] sm:max-w-[85%] ${
                  isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'
                }`}
              >
                {/* Avatar */}
                <div
                  className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 border ${
                    isUser
                      ? 'bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 border-neutral-900'
                      : 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200 border-neutral-200 dark:border-neutral-700'
                  }`}
                >
                  {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>

                {/* Message Bubble */}
                <div
                  className={`min-w-0 max-w-full rounded-2xl px-4 py-3 border shadow-xs break-words ${
                    isUser
                      ? 'bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 border-neutral-900'
                      : 'bg-neutral-50/80 dark:bg-neutral-900/80 text-neutral-900 dark:text-neutral-100 border-black/[0.06] dark:border-white/[0.06]'
                  }`}
                >
                  {/* Bubble header */}
                  <div className="flex items-center justify-between gap-4 text-[10px] opacity-60 mb-1.5 pb-1 border-b border-black/[0.05] dark:border-white/[0.05]">
                    <span className="font-semibold">{isUser ? 'Vous' : selectedRole.name}</span>
                    <div className="flex items-center gap-2">
                      {message.modelUsed && !isUser && (
                        <span className="font-mono text-[9px] px-1.5 py-0.2 rounded bg-black/5 dark:bg-white/10">
                          {message.modelUsed}
                        </span>
                      )}
                      <span>{message.timestamp}</span>
                    </div>
                  </div>

                  {/* Message body */}
                  <div className="overflow-hidden">
                    {isUser ? (
                      <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed">{message.content}</p>
                    ) : (
                      renderFormattedMessage(message.content, message.id)
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Typing indicator */}
          {isLoading && (
            <div className="flex gap-3 mr-auto max-w-[85%] animate-fade-in">
              <div className="h-8 w-8 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center shrink-0">
                <Bot className="h-4 w-4 animate-spin" />
              </div>
              <div className="rounded-2xl px-4 py-3 bg-neutral-50 dark:bg-neutral-900 border border-black/[0.06] dark:border-white/[0.06] text-neutral-500 text-xs flex items-center gap-2">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-neutral-400 animate-bounce" />
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-neutral-400 animate-bounce [animation-delay:0.2s]" />
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-neutral-400 animate-bounce [animation-delay:0.4s]" />
                <span className="ml-2 font-mono text-[11px] text-neutral-400">
                  {selectedRole.name} ({selectedModel}) analyse votre requête...
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggestions chips */}
        <div className="px-4 py-2 bg-neutral-50/70 dark:bg-neutral-900/60 border-t border-black/[0.06] dark:border-white/[0.06]">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
            <span className="text-[11px] font-medium text-neutral-400 shrink-0 flex items-center gap-1">
              <Info className="h-3 w-3" />
              Suggestions :
            </span>
            {selectedRole.suggestions.map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(suggestion)}
                disabled={isLoading}
                className="whitespace-nowrap px-3 py-1 rounded-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-[11.5px] transition shrink-0 disabled:opacity-50"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>

        {/* Input Bar */}
        <div className="p-4 bg-card border-t border-border">
          <div className="flex gap-2 items-end">
            <textarea
              ref={inputRef}
              rows={1}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={`Posez une question à ${selectedRole.name} (Entrée pour envoyer)...`}
              className="flex-1 max-h-32 min-h-[44px] px-4 py-2.5 text-xs rounded-xl border border-input bg-muted text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none leading-relaxed"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={isLoading || !inputMessage.trim()}
              className="h-11 px-5 rounded-xl bg-primary hover:opacity-90 text-primary-foreground font-medium text-xs transition flex items-center justify-center gap-2 disabled:opacity-40 disabled:pointer-events-none"
            >
              <Send className="h-4 w-4" />
              <span className="hidden sm:inline">Envoyer</span>
            </button>
          </div>
          <div className="flex items-center justify-between text-[10px] text-neutral-400 mt-2 px-1">
            <span className="truncate">Shift + Entrée pour un saut de ligne</span>
            <span className="font-mono truncate text-right">Connecté à Google Gemini API</span>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => inputRef.current?.focus()}
        aria-label="Écrire un message à l'assistant"
        className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-4 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 transition hover:scale-105 active:scale-95 sm:hidden"
      >
        <MessageCircle className="h-5 w-5" />
      </button>
    </div>
  );
}
