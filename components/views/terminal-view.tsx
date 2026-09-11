'use client';

// components/views/terminal-view.tsx
// Console Terminal Web RouterOS en direct pour NetPulse Hotspot Manager

import React, { useState, useRef, useEffect } from 'react';
import {
  Terminal as TerminalIcon,
  Play,
  Trash2,
  Copy,
  Check,
  Cpu,
  Users,
  Wifi,
  Globe,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { MikroTikRouter } from '@/lib/types';
import { toast } from 'sonner';

interface TerminalEntry {
  id: string;
  timestamp: string;
  command: string;
  output?: any;
  error?: string;
  elapsedMs?: number;
}

interface TerminalViewProps {
  routers: MikroTikRouter[];
  selectedRouterId?: string;
}

const QUICK_COMMANDS = [
  { label: 'Ressources & CPU', cmd: '/system resource print', icon: Cpu },
  { label: 'Sessions Actives', cmd: '/ip hotspot active print', icon: Users },
  { label: 'Tickets Hotspot', cmd: '/ip hotspot user print', icon: Layers },
  { label: 'Interfaces Réseau', cmd: '/interface print', icon: Wifi },
  { label: 'Ping Google (8.8.8.8)', cmd: '/ping 8.8.8.8 count=3', icon: Globe },
  { label: 'Vider Cache DNS', cmd: '/ip dns cache flush', icon: RotateCcw },
];

export function TerminalView({ routers, selectedRouterId }: TerminalViewProps) {
  const [activeRouterId, setActiveRouterId] = useState<string>(
    selectedRouterId && selectedRouterId !== 'all' ? selectedRouterId : routers[0]?.id || ''
  );
  const [commandInput, setCommandInput] = useState('');
  const [history, setHistory] = useState<TerminalEntry[]>([]);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [isRunning, setIsRunning] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const terminalEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeRouter = routers.find((r) => r.id === activeRouterId) || routers[0];

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const executeCommand = async (cmdToRun?: string) => {
    const cmd = (cmdToRun || commandInput).trim();
    if (!cmd || isRunning) return;

    setIsRunning(true);
    setCommandInput('');
    setHistoryIndex(-1);

    // Add to command history
    setCommandHistory((prev) => [cmd, ...prev.filter((c) => c !== cmd)].slice(0, 50));

    const entryId = `cmd_${Date.now()}`;
    const timestamp = new Date().toLocaleTimeString('fr-FR');

    try {
      const res = await fetch('/api/mikrotik/terminal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          routerId: activeRouter?.id,
          command: cmd,
        }),
      });

      const data = await res.json();

      setHistory((prev) => [
        ...prev,
        {
          id: entryId,
          timestamp,
          command: cmd,
          output: data.output,
          error: data.error,
          elapsedMs: data.elapsedMs,
        },
      ]);
    } catch (err: any) {
      setHistory((prev) => [
        ...prev,
        {
          id: entryId,
          timestamp,
          command: cmd,
          error: err.message || 'Erreur de communication avec le routeur',
        },
      ]);
    } finally {
      setIsRunning(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      executeCommand();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length === 0) return;
      const nextIndex = Math.min(historyIndex + 1, commandHistory.length - 1);
      setHistoryIndex(nextIndex);
      setCommandInput(commandHistory[nextIndex]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const nextIndex = historyIndex - 1;
        setHistoryIndex(nextIndex);
        setCommandInput(commandHistory[nextIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setCommandInput('');
      }
    }
  };

  const copyEntry = (id: string, content: any) => {
    navigator.clipboard.writeText(typeof content === 'string' ? content : JSON.stringify(content, null, 2));
    setCopiedId(id);
    toast.success('Sortie copiée dans le presse-papier !');
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <TerminalIcon className="h-5 w-5" />
            </div>
            <span>Console RouterOS CLI en Direct</span>
          </h2>
          <p className="text-xs text-white/50 mt-1">
            Exécutez des commandes RouterOS v7 en direct via la Socket API native MikroTik
          </p>
        </div>

        {/* Router Selector & Clear */}
        <div className="flex items-center gap-2">
          {routers.length > 1 && (
            <select
              value={activeRouterId}
              onChange={(e) => setActiveRouterId(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white font-medium focus:outline-none focus:border-indigo-500"
            >
              {routers.map((r) => (
                <option key={r.id} value={r.id} className="bg-neutral-900 text-white">
                  {r.name} ({r.host})
                </option>
              ))}
            </select>
          )}

          <button
            onClick={() => setHistory([])}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white/70 text-xs font-medium transition cursor-pointer"
            title="Effacer l'historique du terminal"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Effacer</span>
          </button>
        </div>
      </div>

      {/* Quick Commands Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-xs text-white/40 font-mono shrink-0 mr-1">Raccourcis :</span>
        {QUICK_COMMANDS.map((qc) => {
          const Icon = qc.icon;
          return (
            <button
              key={qc.cmd}
              onClick={() => executeCommand(qc.cmd)}
              disabled={isRunning}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-indigo-500/30 text-white/80 text-xs font-mono transition cursor-pointer shrink-0 disabled:opacity-50"
            >
              <Icon className="h-3.5 w-3.5 text-indigo-400" />
              <span>{qc.label}</span>
            </button>
          );
        })}
      </div>

      {/* Terminal Window */}
      <div className="rounded-2xl border border-white/10 bg-[#0c0d12] shadow-2xl overflow-hidden font-mono text-xs flex flex-col h-[560px]">
        {/* Top Window Bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-white/3 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-yellow-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-green-500/80 inline-block" />
            <span className="text-white/40 text-xs ml-2">
              admin@{activeRouter?.name || 'NetPulse-GW-01'} ({activeRouter?.host || '192.168.1.64'}:8728)
            </span>
          </div>
          <div className="flex items-center gap-2 text-white/30 text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>RouterOS Socket API Connecté</span>
          </div>
        </div>

        {/* Scrollable Terminal Output */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Welcome Banner */}
          <div className="text-white/30 space-y-1 border-b border-white/5 pb-3">
            <p className="text-indigo-400 font-bold">NetPulse Hotspot Manager v2.5 — RouterOS Interactive Shell</p>
            <p>Connecté au routeur MikroTik : {activeRouter?.name} ({activeRouter?.host})</p>
            <p className="text-[11px]">Tapez n&apos;importe quelle commande RouterOS (ex: <span className="text-indigo-300">/system resource print</span>, <span className="text-indigo-300">/ip hotspot user print</span>).</p>
          </div>

          {history.map((entry) => (
            <div key={entry.id} className="space-y-1.5 group">
              {/* Command Line */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-white">
                  <span className="text-emerald-400 font-bold">[admin@{activeRouter?.name || 'MikroTik'}] &gt;</span>
                  <span className="text-indigo-300 font-semibold">{entry.command}</span>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
                  {entry.elapsedMs !== undefined && (
                    <span className="text-[10px] text-white/30">{entry.elapsedMs}ms</span>
                  )}
                  <button
                    onClick={() => copyEntry(entry.id, entry.output || entry.error)}
                    className="p-1 rounded bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition"
                    title="Copier le résultat"
                  >
                    {copiedId === entry.id ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
              </div>

              {/* Error Output */}
              {entry.error && (
                <div className="text-red-400 bg-red-950/20 border border-red-500/20 p-2.5 rounded-lg whitespace-pre-wrap">
                  ❌ {entry.error}
                </div>
              )}

              {/* Success Output */}
              {entry.output && (
                <div className="text-white/80 bg-white/[0.02] border border-white/5 p-3 rounded-lg overflow-x-auto">
                  {Array.isArray(entry.output) ? (
                    entry.output.length === 0 ? (
                      <span className="text-white/30 italic">Résultat vide (0 élément).</span>
                    ) : (
                      <div className="space-y-2">
                        {entry.output.map((item, idx) => (
                          <div key={idx} className="border-b border-white/5 pb-1.5 last:border-0 last:pb-0">
                            {typeof item === 'object' && item !== null ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1">
                                {Object.entries(item).map(([k, v]) => (
                                  <div key={k} className="flex items-baseline gap-1 text-[11px]">
                                    <span className="text-cyan-400 font-medium">{k}:</span>
                                    <span className="text-white/90 truncate">{String(v)}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span>{String(item)}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )
                  ) : typeof entry.output === 'object' ? (
                    <pre className="text-[11px] text-emerald-300 whitespace-pre-wrap">
                      {JSON.stringify(entry.output, null, 2)}
                    </pre>
                  ) : (
                    <pre className="text-[11px] text-white/90 whitespace-pre-wrap">{entry.output}</pre>
                  )}
                </div>
              )}
            </div>
          ))}

          <div ref={terminalEndRef} />
        </div>

        {/* Command Input Form */}
        <div className="p-3 bg-white/2 border-t border-white/5 flex items-center gap-2 shrink-0">
          <span className="text-emerald-400 font-bold pl-1">&gt;</span>
          <input
            ref={inputRef}
            type="text"
            value={commandInput}
            onChange={(e) => setCommandInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isRunning ? 'Exécution en cours sur le routeur...' : 'Tapez une commande (ex: /system resource print)...'}
            disabled={isRunning}
            className="flex-1 bg-transparent text-white focus:outline-none text-xs placeholder:text-white/30 font-mono"
            autoFocus
          />
          <button
            onClick={() => executeCommand()}
            disabled={!commandInput.trim() || isRunning}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-white text-xs font-semibold transition cursor-pointer"
          >
            <Play className={`h-3 w-3 ${isRunning ? 'animate-spin' : ''}`} />
            <span>Exécuter</span>
          </button>
        </div>
      </div>
    </div>
  );
}
