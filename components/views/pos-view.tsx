'use client';

// components/views/pos-view.tsx
// Guichet de Vente Rapide / POS Express pour Caissiers et Gérants de Hotspot

import { useState, useMemo } from 'react';
import Image from 'next/image';
import {
    ShoppingCart,
    Zap,
    CheckCircle2,
    Copy,
    Clock,
    DollarSign,
    TrendingUp,
    Receipt,
    ArrowRight
} from 'lucide-react';
import QRCode from 'qrcode';
import { HotspotTicket, HotspotProfile, MikroTikRouter } from '@/lib/types';
import { toast } from 'sonner';

interface PosViewProps {
  profiles: HotspotProfile[];
  tickets: HotspotTicket[];
  routers: MikroTikRouter[];
  currency: string;
  onRefresh: () => void;
  onNavigateToClosure: () => void;
}

export function PosView({
  profiles,
  tickets,
  routers,
  currency,
  onRefresh,
  onNavigateToClosure,
}: PosViewProps) {
  const [isSelling, setIsSelling] = useState<string | null>(null);
  const [lastSoldTicket, setLastSoldTicket] = useState<HotspotTicket | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Tickets disponibles en stock par profil
  const availableTicketsByProfile = useMemo(() => {
    const map: Record<string, HotspotTicket[]> = {};
    for (const p of profiles) {
      map[p.id] = tickets.filter(
        (t) => t.profileId === p.id && t.status === 'available'
      );
    }
    return map;
  }, [profiles, tickets]);

  // Ventes du jour (tickets vendus non clôturés ou soldAt aujourd'hui)
  const todaySales = useMemo(() => {
    return tickets.filter((t) => t.status === 'active' || t.status === 'used');
  }, [tickets]);

  const todayRevenue = useMemo(() => {
    return todaySales.reduce((acc, t) => acc + (t.price || 0), 0);
  }, [todaySales]);

  // Vente express en 1-clic
  const handleQuickSell = async (profile: HotspotProfile) => {
    const available = availableTicketsByProfile[profile.id];
    if (!available || available.length === 0) {
      toast.error(`Rupture de stock pour le forfait ${profile.name} ! Veuillez générer un nouveau lot.`);
      return;
    }

    const ticketToSell = available[0];
    setIsSelling(profile.id);

    try {
      const res = await fetch('/api/tickets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: ticketToSell.id,
          action: 'sell',
        }),
      });

      const data = await res.json();
      if (data.success) {
        const sold = {
          ...ticketToSell,
          status: 'used' as const,
          soldAt: new Date().toISOString(),
        };
        setLastSoldTicket(sold);

        // Génération du QR Code de connexion automatique
        const targetRouter = routers.find((r) => r.id === ticketToSell.routerId);
        let dns = targetRouter?.hotspotDnsName || 'login.net';
        dns = dns.replace(/^https?:\/\//i, '').replace(/\/+$/, '');
        const loginUrl = `http://${dns}/login?username=${encodeURIComponent(sold.code)}&password=${encodeURIComponent(sold.password || sold.code)}`;

        try {
          const qr = await QRCode.toDataURL(loginUrl, { width: 220, margin: 1 });
          setQrDataUrl(qr);
        } catch {}

        toast.success(`Coupon ${sold.code} (${profile.name}) vendu avec succès !`);
        onRefresh();
      } else {
        toast.error(data.error || 'Erreur lors de la vente');
      }
    } catch (err: any) {
      toast.error(`Erreur: ${err.message}`);
    } finally {
      setIsSelling(null);
    }
  };

  const copyTicketAccess = () => {
    if (!lastSoldTicket) return;
    const text = `🎟️ TICKET NETPULSE WIFI\nCode: ${lastSoldTicket.code}\nMot de passe: ${lastSoldTicket.password || lastSoldTicket.code}\nValable: ${lastSoldTicket.validityDuration}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Accès copiés !');
    setTimeout(() => setCopied(false), 2000);
  };

  const printSingleTicket = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header & KPI Caisse */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Recette du jour */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 flex items-center justify-between">
          <div>
            <span className="text-xs text-white/50 font-medium">Recette Caisse Enregistrée</span>
            <p className="text-2xl font-black text-emerald-400 mt-1">
              {todayRevenue.toLocaleString()} {currency}
            </p>
            <span className="text-xs text-white/40">{todaySales.length} ticket(s) vendu(s)</span>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* Total Stock Disponible */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 flex items-center justify-between">
          <div>
            <span className="text-xs text-white/50 font-medium">Coupons Disponibles en Rayon</span>
            <p className="text-2xl font-black text-indigo-400 mt-1">
              {tickets.filter((t) => t.status === 'available').length}
            </p>
            <span className="text-xs text-white/40">Sur {profiles.length} forfait(s) configuré(s)</span>
          </div>
          <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400">
            <Receipt className="w-6 h-6" />
          </div>
        </div>

        {/* Clôture Rapide */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 flex items-center justify-between sm:col-span-2 lg:col-span-1">
          <div>
            <span className="text-xs text-white/50 font-medium">Fin de Service / Caisse</span>
            <p className="text-sm font-bold text-white mt-1">Arrêté Journalier</p>
            <button
              onClick={onNavigateToClosure}
              className="mt-2 text-xs font-semibold text-amber-400 hover:text-amber-300 transition flex items-center gap-1 cursor-pointer"
            >
              <span>Accéder à la clôture de caisse</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Point de Vente — Grandes Tuiles Tactiles */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Guichet Express — Forfaits Hotspot</h2>
              <p className="text-xs text-white/40">Cliquez sur un forfait pour vendre et délivrer un ticket immédiatement</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {profiles.map((prof) => {
            const stock = availableTicketsByProfile[prof.id]?.length || 0;
            const isOutOfStock = stock === 0;
            const isLow = stock > 0 && stock < prof.minStockAlert;
            const loading = isSelling === prof.id;

            return (
              <button
                key={prof.id}
                onClick={() => handleQuickSell(prof)}
                disabled={isOutOfStock || loading}
                className={`
                  relative rounded-3xl p-6 text-left transition-all duration-300 flex flex-col justify-between border cursor-pointer
                  ${isOutOfStock
                    ? 'bg-neutral-900/40 border-white/5 opacity-50 cursor-not-allowed'
                    : 'bg-white/5 hover:bg-white/10 border-white/10 hover:border-indigo-500/50 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0'}
                `}
              >
                {/* Forfait Badges */}
                <div className="flex items-start justify-between w-full mb-4">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: prof.color || '#3b82f6' }}
                    />
                    <span className="text-xs font-mono font-bold text-white/70 uppercase">
                      Profil {prof.name}
                    </span>
                  </div>

                  <span
                    className={`text-[11px] font-mono px-2 py-0.5 rounded-full font-semibold ${
                      isOutOfStock
                        ? 'bg-red-500/20 text-red-400'
                        : isLow
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-emerald-500/20 text-emerald-300'
                    }`}
                  >
                    {isOutOfStock ? 'Rupture' : `${stock} restant(s)`}
                  </span>
                </div>

                {/* Price Display */}
                <div className="my-2">
                  <p className="text-3xl font-black text-white tracking-tight">
                    {Number(prof.price).toLocaleString()} <span className="text-base font-normal text-white/50">{currency}</span>
                  </p>
                  <div className="flex items-center gap-1.5 text-xs text-white/60 mt-1 font-medium">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Validité : {prof.validityDuration}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-white/40 mt-0.5">
                    <Zap className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Débit : {prof.rateLimit || 'Illimité'}</span>
                  </div>
                </div>

                {/* Action CTA */}
                <div className="mt-4 pt-3 border-t border-white/5 w-full flex items-center justify-between text-xs font-semibold">
                  <span className="text-indigo-400">
                    {loading ? 'Validation en cours...' : isOutOfStock ? 'Stock Épuisé' : 'Délivrer le Ticket'}
                  </span>
                  <div className={`p-2 rounded-xl bg-indigo-500/20 text-indigo-300 ${loading ? 'animate-spin' : ''}`}>
                    <ShoppingCart className="w-4 h-4" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Modal Reçu Client Pop-up */}
      {lastSoldTicket && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#12131a] border border-white/15 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-bold text-sm text-white">Ticket Vendu &amp; Prêt</span>
              </div>
              <button
                onClick={() => setLastSoldTicket(null)}
                className="text-white/40 hover:text-white text-xs cursor-pointer px-2 py-1 rounded-lg bg-white/5"
              >
                Fermer
              </button>
            </div>

            {/* Ticket Card Style Recu */}
            <div className="bg-white text-black rounded-2xl p-5 text-center space-y-3 font-mono shadow-inner">
              <div className="border-b border-dashed border-black/20 pb-2">
                <p className="font-black text-sm tracking-wider uppercase">NETPULSE HOTSPOT</p>
                <p className="text-[11px] text-neutral-600">Accès Internet Haut Débit</p>
              </div>

              {/* Code & Mot de passe */}
              <div className="py-1">
                <p className="text-xs text-neutral-500 uppercase font-sans">Code Utilisateur</p>
                <p className="text-2xl font-black tracking-widest text-indigo-900">{lastSoldTicket.code}</p>
                {lastSoldTicket.password && lastSoldTicket.password !== lastSoldTicket.code && (
                  <p className="text-xs text-neutral-600 mt-1">
                    Pass : <span className="font-bold text-black">{lastSoldTicket.password}</span>
                  </p>
                )}
              </div>

              {/* QR Code */}
              {qrDataUrl && (
                <div className="flex flex-col items-center justify-center pt-1">
                  <Image src={qrDataUrl} alt="QR Code Login" width={144} height={144} className="w-36 h-36 border border-black/10 rounded-xl" unoptimized />
                  <p className="text-[10px] text-neutral-500 mt-1 font-sans">Scannez pour vous connecter directement</p>
                </div>
              )}

              {/* Details */}
              <div className="border-t border-dashed border-black/20 pt-2 flex justify-between text-[11px] text-neutral-600 font-sans">
                <span>Forfait : <b>{lastSoldTicket.profileName}</b></span>
                <span>Prix : <b>{lastSoldTicket.price} {currency}</b></span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={copyTicketAccess}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white text-xs font-semibold transition cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copied ? 'Copié !' : 'Copier Infos'}</span>
              </button>

              <button
                onClick={() => {
                  setLastSoldTicket(null);
                  toast.success('Prêt pour la vente suivante !');
                }}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition cursor-pointer"
              >
                <span>Vente Suivante</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
