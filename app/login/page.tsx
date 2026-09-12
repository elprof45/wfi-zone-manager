'use client';

import React, { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn, useSession } from '@/lib/auth-client';
import {
    Wifi,
    ShieldCheck,
    UserCheck,
    Lock,
    Mail,
    ArrowRight,
    Loader2,
    Sparkles,
    Eye,
    EyeOff,
    Activity,
    Layers
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/';

  const { data: session } = useSession();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // If already authenticated, redirect safely
  useEffect(() => {
    if (session?.user) {
      router.push(redirectPath);
    }
  }, [session, redirectPath, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setIsLoading(true);
    try {
      const res = await signIn.email({
        email: email.trim().toLowerCase(),
        password,
      });

      if (res.error) {
        toast.error(res.error.message || 'Identifiants incorrects. Vérifiez votre email et mot de passe.');
        setIsLoading(false);
        return;
      }

      toast.success('Authentification réussie ! Chargement de votre espace...');
      // Clean reload to refresh session cookies
      window.location.href = redirectPath;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur de connexion au serveur';
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
    <div className="min-h-screen bg-background text-foreground flex flex-col lg:flex-row antialiased selection:bg-primary/20">
      {/* ── Left Hero Section (SaaS Presentation & Live Network Highlights) ── */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-card via-background to-muted border-r border-border p-12 flex-col justify-between overflow-hidden">
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
              </div>
              <p className="text-xs text-muted-foreground">SaaS Hotspot & MikroTik Core Gateway</p>
            </div>
          </div>
        </div>

        {/* Center Feature Highlights */}
        <div className="relative z-10 my-auto py-8 space-y-6 max-w-lg">
          <div className="space-y-2">
            <h2 className="text-3xl font-extrabold tracking-tight text-foreground leading-tight">
              Gestion commerciale et monitoring haute disponibilité.
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Découplez votre facturation hotspot de RouterOS. Imprimez des tickets en masse, gérez plusieurs sites et encaissez en toute sécurité.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <div className="p-4 rounded-2xl bg-card/60 backdrop-blur-md border border-border flex items-start gap-3 shadow-sm hover:border-primary/40 transition">
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-foreground">Découplage Intelligent & Tickets Déconnectés</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Vendez des tickets même en cas de latence routeur. Impression thermique 58/80mm ultra-rapide.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-card/60 backdrop-blur-md border border-border flex items-start gap-3 shadow-sm hover:border-primary/40 transition">
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-foreground">Clôtures de Caisse & Audit Financier</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Rapports de ventes quotidiens avec ventilation par caissier, profils et devises locales (FCFA, XOF, USD).
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-card/60 backdrop-blur-md border border-border flex items-start gap-3 shadow-sm hover:border-primary/40 transition">
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-foreground">Hub de Notifications Multi-Canal</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Alertes de stock critique et bilans journaliers expédiés via Telegram, Discord HTTP & Email.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right Auth Form Section ── */}
      <div className="flex-1 flex flex-col justify-center items-center p-4 sm:p-12 relative overflow-y-auto">
        <div className="w-full max-w-md space-y-6">
          {/* Mobile Header */}
          <div className="lg:hidden flex items-center gap-2.5 mb-2">
            <div className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-md">
              <Wifi className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-lg text-foreground">NetPulse Hotspot</span>
              <p className="text-[11px] text-muted-foreground">Plateforme SaaS Enterprise</p>
            </div>
          </div>

          {/* Card */}
          <div className="bg-card border border-border rounded-3xl shadow-xl p-5 sm:p-8 space-y-6 backdrop-blur-xl">
            {/* Title & Switch Tabs */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-foreground">
                    Connexion
                  </h1>
                  <p className="text-xs text-muted-foreground mt-1">
                    Accédez à votre console d&apos;administration ou de caisse
                  </p>
                </div>
                <div className="p-2 rounded-2xl bg-muted/60 text-muted-foreground">
                  <Lock className="w-5 h-5" />
                </div>
              </div>

              {/* Toggle Login / Register */}
              <div className="grid grid-cols-2 p-1 bg-muted rounded-2xl text-xs font-semibold">
                <button
                  type="button"
                  className="py-2 rounded-xl bg-card text-foreground shadow-sm text-center transition"
                >
                  Se connecter
                </button>
                <Link
                  href={`/register${redirectPath !== '/' ? `?redirect=${encodeURIComponent(redirectPath)}` : ''}`}
                  className="py-2 rounded-xl text-muted-foreground hover:text-foreground text-center transition"
                >
                  Créer un compte
                </Link>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Adresse e-mail
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@netpulse.lan"
                    className="w-full pl-10 pr-4 py-2.5 bg-muted/60 border border-input rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Mot de passe
                  </label>
                  <button
                    type="button"
                    onClick={() => toast.info('Contactez votre Super Administrateur pour réinitialiser vos accès.')}
                    className="text-[11px] text-primary hover:underline"
                  >
                    Oublié ?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-muted/60 border border-input rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition cursor-pointer"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Masquer' : 'Afficher'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-input text-primary focus:ring-ring w-3.5 h-3.5"
                  />
                  <span>Mémoriser ma session</span>
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
                    Connexion en cours...
                  </>
                ) : (
                  <>
                    Se connecter à l&apos;espace
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Quick Demo Logins Bar */}
            <div className="pt-4 border-t border-border space-y-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5 font-medium">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  Accès démo pré-configurés
                </span>
                <span className="text-[10px]">1 clic pour remplir</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickFill('koffikomi.dev@gmail.com', 'admin123', 'Super Admin')}
                  className="flex items-center gap-2 p-2.5 rounded-xl border border-border hover:border-primary/40 hover:bg-muted/60 transition text-left cursor-pointer group"
                >
                  <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">Super Admin</p>
                    <p className="text-[10px] text-muted-foreground truncate">Koffi Komi</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickFill('amina.caisse@netpulse.local', 'caisse123', 'Caissier')}
                  className="flex items-center gap-2 p-2.5 rounded-xl border border-border hover:border-emerald-500/40 hover:bg-muted/60 transition text-left cursor-pointer group"
                >
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">Caissier</p>
                    <p className="text-[10px] text-muted-foreground truncate">Amina Diallo</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Setup Wizard Link for initial installs */}
            <div className="pt-2 text-center">
              <Link
                href="/setup"
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition"
              >
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span>Nouvelle installation ? Lancer l&apos;Assistant de configuration (.env)</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="max-h-screen flex items-center justify-center bg-background">
          <div className="w-12 h-12 rounded-2xl bg-primary/20 animate-pulse" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
