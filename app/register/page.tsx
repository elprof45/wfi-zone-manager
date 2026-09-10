'use client';

import React, { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signUp } from '@/lib/auth-client';
import {
  Wifi,
  ShieldCheck,
  Lock,
  Mail,
  User,
  ArrowRight,
  Loader2,
  CheckCircle2,
  Eye,
  EyeOff,
  UserCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'cashier'>('admin');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Simple password strength calculation
  const getPasswordStrength = () => {
    if (!password) return 0;
    let score = 0;
    if (password.length >= 8) score += 25;
    if (/[A-Z]/.test(password)) score += 25;
    if (/[0-9]/.test(password)) score += 25;
    if (/[^A-Za-z0-9]/.test(password)) score += 25;
    return score;
  };
  const passwordStrength = getPasswordStrength();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Veuillez saisir votre nom complet');
      return;
    }
    if (!email.trim()) {
      toast.error('Veuillez saisir une adresse e-mail valide');
      return;
    }
    if (password.length < 8) {
      toast.error('Le mot de passe doit comporter au moins 8 caractères');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    setIsLoading(true);
    try {
      const res = await signUp.email({
        email: email.trim().toLowerCase(),
        password,
        name: name.trim(),
        role,
      } as any);

      if (res.error) {
        toast.error(res.error.message || 'Échec de la création du compte');
        setIsLoading(false);
        return;
      }

      toast.success('Compte créé avec succès ! Bienvenue sur NetPulse.');
      router.push(redirectPath);
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Une erreur inattendue est survenue';
      toast.error(message);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-100 via-neutral-50 to-neutral-200 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950 p-4 relative overflow-hidden">
      {/* Glow decorations */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 dark:bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 py-8">
        <div className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border border-neutral-200/80 dark:border-neutral-800/80 rounded-2xl shadow-2xl p-8 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25 mb-1">
              <Wifi className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
              Créer un compte NetPulse
            </h1>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Provisionnez un accès administrateur ou caisse pour votre réseau MikroTik
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nom */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                Nom complet
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ex: Yao Koffi"
                  className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-sm"
                />
              </div>
            </div>

            {/* Email */}
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
                  placeholder="admin@votre-domaine.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-sm"
                />
              </div>
            </div>

            {/* Role Choice */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                Rôle initial
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRole('admin')}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition cursor-pointer ${
                    role === 'admin'
                      ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400'
                      : 'border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-850 text-neutral-600 dark:text-neutral-400'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold">Admin</p>
                    <p className="text-[10px] opacity-75">Gestion & Routeurs</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setRole('cashier')}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition cursor-pointer ${
                    role === 'cashier'
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-850 text-neutral-600 dark:text-neutral-400'
                  }`}
                >
                  <UserCheck className="w-4 h-4 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold">Caissier</p>
                    <p className="text-[10px] opacity-75">Ventes & Reçus</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Mot de passe */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Au moins 8 caractères"
                  className="w-full pl-10 pr-10 py-2.5 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password strength bar */}
              {password && (
                <div className="space-y-1 pt-1">
                  <div className="h-1 w-full bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        passwordStrength <= 25
                          ? 'bg-rose-500'
                          : passwordStrength <= 50
                          ? 'bg-amber-500'
                          : passwordStrength <= 75
                          ? 'bg-blue-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${passwordStrength}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-neutral-500">
                    <span>Force du mot de passe</span>
                    <span>
                      {passwordStrength <= 25
                        ? 'Faible'
                        : passwordStrength <= 50
                        ? 'Moyen'
                        : passwordStrength <= 75
                        ? 'Bon'
                        : 'Très fort'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Confirmer mot de passe */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                Confirmer le mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Répétez votre mot de passe"
                  className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-sm"
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium rounded-xl shadow-lg shadow-blue-500/25 transition flex items-center justify-center gap-2 text-sm disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Création du compte en cours...
                </>
              ) : (
                <>
                  Créer mon compte
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Footer link to Login */}
          <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800/60 text-center space-y-2">
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              Vous avez déjà un compte ?{' '}
              <Link
                href={`/login${redirectPath !== '/' ? `?redirect=${encodeURIComponent(redirectPath)}` : ''}`}
                className="font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-0.5"
              >
                Se connecter
              </Link>
            </p>
            <p className="text-[11px] text-neutral-400">
              NetPulse SaaS • Données réelles PostgreSQL & RouterOS v7
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-100 via-neutral-50 to-neutral-200 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 animate-pulse" />
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
