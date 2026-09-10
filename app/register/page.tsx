'use client';

import React, { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signUp } from '@/lib/auth-client';
import {
  Wifi, ShieldCheck, Lock, Mail, User,
  ArrowRight, Loader2, Eye, EyeOff, UserCheck,
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

  const strengthLabel = passwordStrength <= 25 ? 'Faible' : passwordStrength <= 50 ? 'Moyen' : passwordStrength <= 75 ? 'Bon' : 'Très fort';
  const strengthColor = passwordStrength <= 25 ? 'bg-destructive' : passwordStrength <= 50 ? 'bg-amber-500' : passwordStrength <= 75 ? 'bg-primary' : 'bg-emerald-500';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Veuillez saisir votre nom complet'); return; }
    if (!email.trim()) { toast.error('Veuillez saisir une adresse e-mail valide'); return; }
    if (password.length < 8) { toast.error('Le mot de passe doit comporter au moins 8 caractères'); return; }
    if (password !== confirmPassword) { toast.error('Les mots de passe ne correspondent pas'); return; }

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

  const inputClass = 'w-full pl-10 pr-4 py-2.5 bg-muted border border-input rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition text-sm';
  const labelClass = 'text-xs font-semibold text-muted-foreground uppercase tracking-wider';

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 py-8">
        <div className="bg-card border border-border rounded-2xl shadow-xl p-8 space-y-6 backdrop-blur-xl">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary text-primary-foreground shadow-lg mb-1">
              <Wifi className="w-7 h-7 stroke-[2.2]" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Créer un compte NetPulse
            </h1>
            <p className="text-xs text-muted-foreground">
              Provisionnez un accès administrateur ou caisse pour votre réseau MikroTik
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nom */}
            <div className="space-y-1.5">
              <label className={labelClass}>Nom complet</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="ex: Yao Koffi" className={inputClass} />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className={labelClass}>Adresse e-mail</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@votre-domaine.com" className={inputClass} />
              </div>
            </div>

            {/* Role */}
            <div className="space-y-1.5">
              <label className={labelClass}>Rôle initial</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRole('admin')}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition cursor-pointer ${
                    role === 'admin'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:bg-muted text-muted-foreground'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold">Admin</p>
                    <p className="text-[10px] opacity-75">Gestion &amp; Routeurs</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setRole('cashier')}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition cursor-pointer ${
                    role === 'cashier'
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'border-border hover:bg-muted text-muted-foreground'
                  }`}
                >
                  <UserCheck className="w-4 h-4 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold">Caissier</p>
                    <p className="text-[10px] opacity-75">Ventes &amp; Reçus</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Mot de passe */}
            <div className="space-y-1.5">
              <label className={labelClass}>Mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Au moins 8 caractères"
                  className="w-full pl-10 pr-10 py-2.5 bg-muted border border-input rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {password && (
                <div className="space-y-1 pt-1">
                  <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-300 ${strengthColor}`} style={{ width: `${passwordStrength}%` }} />
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>Force du mot de passe</span>
                    <span>{strengthLabel}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Confirmer */}
            <div className="space-y-1.5">
              <label className={labelClass}>Confirmer le mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Répétez votre mot de passe"
                  className={inputClass}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 bg-primary hover:opacity-90 active:scale-[0.98] text-primary-foreground font-semibold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Création du compte en cours...</>
              ) : (
                <>Créer mon compte<ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          <div className="pt-4 border-t border-border text-center space-y-2">
            <p className="text-xs text-muted-foreground">
              Vous avez déjà un compte ?{' '}
              <Link
                href={`/login${redirectPath !== '/' ? `?redirect=${encodeURIComponent(redirectPath)}` : ''}`}
                className="font-semibold text-primary hover:underline"
              >
                Se connecter
              </Link>
            </p>
            <p className="text-[11px] text-muted-foreground">
              NetPulse SaaS • Données réelles PostgreSQL &amp; RouterOS v7
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 rounded-2xl bg-primary/20 animate-pulse" />
      </div>
    }>
      <RegisterForm />
    </Suspense>
  );
}
