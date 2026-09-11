'use client';

import React, { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import {
    Wifi,
    ShieldCheck,
    Lock,
    Mail,
    User,
    ArrowRight,
    Loader2,
    Eye,
    EyeOff,
    UserCheck,
    Building2,
    Sparkles,
    Activity
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/';

  const [orgName, setOrgName] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'cashier'>('admin');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // Password rules validation
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  const getPasswordStrength = () => {
    if (!password) return 0;
    let score = 0;
    if (hasMinLength) score += 25;
    if (hasUppercase) score += 25;
    if (hasNumber) score += 25;
    if (hasSpecial) score += 25;
    return score;
  };
  const passwordStrength = getPasswordStrength();

  const strengthLabel =
    passwordStrength <= 25
      ? 'Faible'
      : passwordStrength <= 50
      ? 'Moyen'
      : passwordStrength <= 75
      ? 'Robuste'
      : 'Excellent';

  const strengthColor =
    passwordStrength <= 25
      ? 'bg-destructive'
      : passwordStrength <= 50
      ? 'bg-amber-500'
      : passwordStrength <= 75
      ? 'bg-primary'
      : 'bg-emerald-500';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Veuillez saisir votre nom complet');
      return;
    }
    if (!email.trim()) {
      toast.error('Veuillez saisir une adresse e-mail professionnelle valide');
      return;
    }
    if (password.length < 8) {
      toast.error('Le mot de passe doit comporter au moins 8 caractères');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Les mots de passe saisis ne correspondent pas');
      return;
    }
    if (!acceptTerms) {
      toast.error('Veuillez accepter les conditions d’utilisation');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          role,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const msg =
          res.status === 409
            ? 'Un compte avec cet email existe déjà.'
            : data?.error || 'Échec de la création du compte';
        toast.error(msg);
        setIsLoading(false);
        return;
      }

      toast.success(
        data.isFirstUser
          ? `Compte ${role} créé ! Bienvenue sur NetPulse.`
          : 'Compte créé avec succès ! Bienvenue sur NetPulse.'
      );
      window.location.href = redirectPath;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Une erreur inattendue est survenue';
      toast.error(message);
      setIsLoading(false);
    }
  };

  const inputClass =
    'w-full pl-10 pr-4 py-2.5 bg-muted/60 border border-input rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition text-sm';
  const labelClass = 'text-xs font-semibold text-muted-foreground uppercase tracking-wider';

  return (
    <div className="h-screen overflow-hidden bg-background text-foreground flex flex-col lg:flex-row antialiased selection:bg-primary/20">
      {/* ── Left Hero Section (SaaS Presentation) ── */}
      <div className="hidden h-screen shrink-0 lg:flex lg:w-1/2 bg-gradient-to-br from-card via-background to-muted border-r border-border p-12 flex-col justify-between overflow-hidden">
        {/* Glow & Atmosphere */}
        <div className="absolute top-0 -left-20 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />

        {/* Top Branding */}
        <div className="relative z-10 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/25">
              <Wifi className="w-6 h-6 stroke-[2.4]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xl tracking-tight text-foreground">NetPulse</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary/15 text-primary border border-primary/20">
                  Onboarding
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Création d&apos;accès Réseau & Caisse</p>
            </div>
          </div>
        </div>

        {/* Center Feature Highlights */}
        <div className="relative z-10 my-auto max-w-lg">
          <div className="space-y-2">
            <h2 className="text-3xl font-extrabold tracking-tight text-foreground leading-tight">
              Rejoignez votre plateforme de gestion hotspot.
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Créez votre profil en quelques secondes pour accéder aux consoles de supervision MikroTik ou aux modules de vente caisse.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <div className="p-4 rounded-2xl bg-card/60 backdrop-blur-md border border-border flex items-start gap-3 shadow-sm">
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-foreground">Rôles Sécurisés & Granulaires</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Gestionnaire administrateur pour la configuration réseau ou caissier restreint aux ventes de tickets.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-card/60 backdrop-blur-md border border-border flex items-start gap-3 shadow-sm">
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-foreground">Synchronisation Automatique .env & Base</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Compatible Docker Compose, PostgreSQL 16 local et déploiements hybrides sur site.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right Auth Form Section ── */}
      <div className="flex-1 min-h-0 h-screen overflow-y-auto px-4 py-6 sm:px-8 sm:py-10 lg:px-12">
        <div className="flex min-h-full w-full items-center justify-center">
          {/* Card */}
          <div className="w-full max-w-md bg-card border border-border rounded-3xl shadow-xl p-6 sm:p-8 space-y-6 backdrop-blur-xl">
            {/* Title & Switch Tabs */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-foreground">
                    Créer un compte
                  </h1>
                  <p className="text-xs text-muted-foreground mt-1">
                    Enregistrez un nouvel utilisateur pour ce hotspot
                  </p>
                </div>
                <div className="p-2 rounded-2xl bg-muted/60 text-muted-foreground">
                  <UserCheck className="w-5 h-5" />
                </div>
              </div>

              {/* Toggle Login / Register */}
              <div className="grid grid-cols-2 p-1 bg-muted rounded-2xl text-xs font-semibold">
                <Link
                  href={`/login${redirectPath !== '/' ? `?redirect=${encodeURIComponent(redirectPath)}` : ''}`}
                  className="py-2 rounded-xl text-muted-foreground hover:text-foreground text-center transition"
                >
                  Se connecter
                </Link>
                <button
                  type="button"
                  className="py-2 rounded-xl bg-card text-foreground shadow-sm text-center transition"
                >
                  Créer un compte
                </button>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Organization (Optional) */}
              <div className="space-y-1.5">
                <label className={labelClass}>Établissement / Réseau (Optionnel)</label>
                <div className="relative">
                  <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="ex: NetPulse Cyber Hub"
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Nom */}
              <div className="space-y-1.5">
                <label className={labelClass}>Nom complet</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="ex: Yao Koffi"
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className={labelClass}>Adresse e-mail</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@votre-domaine.com"
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Role selection */}
              <div className="space-y-1.5">
                <label className={labelClass}>Rôle initial</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('admin')}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition cursor-pointer ${
                      role === 'admin'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:bg-muted/60 text-muted-foreground'
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
                        : 'border-border hover:bg-muted/60 text-muted-foreground'
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
                    className="w-full pl-10 pr-10 py-2.5 bg-muted/60 border border-input rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition cursor-pointer"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password Strength bar */}
                {password && (
                  <div className="space-y-1 pt-1">
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${strengthColor}`}
                        style={{ width: `${passwordStrength}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>Force du mot de passe : <strong>{strengthLabel}</strong></span>
                      <div className="flex items-center gap-2">
                        <span className={hasMinLength ? 'text-emerald-500' : 'text-muted-foreground'}>8+ car.</span>
                        <span className={hasUppercase ? 'text-emerald-500' : 'text-muted-foreground'}>Maj.</span>
                        <span className={hasNumber ? 'text-emerald-500' : 'text-muted-foreground'}>Chiffre</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirmer le mot de passe */}
              <div className="space-y-1.5">
                <label className={labelClass}>Confirmer le mot de passe</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Répétez le mot de passe"
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Terms */}
              <div className="pt-1">
                <label className="flex items-start gap-2 cursor-pointer text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    className="rounded border-input text-primary focus:ring-ring w-3.5 h-3.5 mt-0.5"
                  />
                  <span>
                    J&apos;accepte les conditions d&apos;utilisation et la politique de confidentialité locale de NetPulse.
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 px-4 bg-primary hover:opacity-90 active:scale-[0.99] text-primary-foreground font-semibold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Création du compte...
                  </>
                ) : (
                  <>
                    Finaliser l&apos;inscription
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="pt-2 text-center border-t border-border">
              <Link
                href="/setup"
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition"
              >
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span>Besoin d&apos;un déploiement complet ? Lancer le Setup (.env)</span>
              </Link>
            </div>
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
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="w-12 h-12 rounded-2xl bg-primary/20 animate-pulse" />
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
