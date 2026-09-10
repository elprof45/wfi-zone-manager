'use client';

import React, { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from '@/lib/auth-client';
import { Wifi, ShieldCheck, UserCheck, Lock, Mail, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    setIsLoading(true);
    try {
      const res = await signIn.email({
        email,
        password,
      });

      if (res.error) {
        toast.error(res.error.message || 'Identifiants invalides');
        setIsLoading(false);
        return;
      }

      toast.success('Connexion réussie ! Redirection...');
      router.push(redirectPath);
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Une erreur inattendue est survenue';
      toast.error(message);
      setIsLoading(false);
    }
  };

  const handleQuickFill = (demoEmail: string, demoPass: string, roleName: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    toast.info(`Identifiants ${roleName} pré-remplis`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-100 via-neutral-50 to-neutral-200 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950 p-4 relative overflow-hidden">
      {/* Background glow decorations */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 dark:bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Card */}
        <div className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border border-neutral-200/80 dark:border-neutral-800/80 rounded-2xl shadow-2xl p-8 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25 mb-2">
              <Wifi className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
              NetPulse Hotspot
            </h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Système de gestion SaaS de Hotspots MikroTik
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                Adresse e-mail
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nom@domaine.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-sm"
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                  Mot de passe
                </label>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium rounded-xl shadow-lg shadow-blue-500/25 transition flex items-center justify-center gap-2 text-sm disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Connexion en cours...
                </>
              ) : (
                <>
                  Se connecter
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Registration link */}
          <div className="text-center pt-1">
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              Pas encore de compte ?{' '}
              <Link
                href={`/register${redirectPath !== '/' ? `?redirect=${encodeURIComponent(redirectPath)}` : ''}`}
                className="font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-0.5"
              >
                Créer un compte
              </Link>
            </p>
          </div>

          {/* Quick Demo Logins */}
          <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800/60 space-y-3">
            <div className="flex items-center justify-between text-xs text-neutral-500">
              <span className="flex items-center gap-1 font-medium">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Accès rapide pré-configuré
              </span>
              <span className="text-[11px] text-neutral-400">Cliquez pour pré-remplir</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill('koffikomi.dev@gmail.com', 'admin123', 'Super Admin')}
                className="flex items-center gap-2 p-2.5 rounded-xl border border-neutral-200/80 dark:border-neutral-700/80 hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition text-left cursor-pointer"
              >
                <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-neutral-900 dark:text-white truncate">Super Admin</p>
                  <p className="text-[10px] text-neutral-500 truncate">Koffi Komi</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('amina.caisse@netpulse.local', 'caisse123', 'Caissier')}
                className="flex items-center gap-2 p-2.5 rounded-xl border border-neutral-200/80 dark:border-neutral-700/80 hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition text-left cursor-pointer"
              >
                <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-neutral-900 dark:text-white truncate">Caissier</p>
                  <p className="text-[10px] text-neutral-500 truncate">Amina Diallo</p>
                </div>
              </button>
            </div>
          </div>

          <div className="text-center pt-2">
            <p className="text-[11px] text-neutral-400">
              NetPulse v2.0 • PostgreSQL + Drizzle ORM • MikroTik RouterOS
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-100 via-neutral-50 to-neutral-200 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 animate-pulse" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
