// app/api/mikrotik/sync/route.ts
// Synchronisation bidirectionnelle MikroTik <-> NetPulse (Profils, Ventes Mikhmon, Tickets)

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hotspotProfiles, hotspotTickets } from '@/lib/db/schema';
import { getAllRouters } from '@/lib/db/queries/routers';
import { MikroTikClient } from '@/lib/mikrotik/client';
import { eq, and } from 'drizzle-orm';
import { createAuditLog } from '@/lib/db/queries/audit';
import { decryptRouterPassword } from '@/lib/secret-crypto';
import { requireRole } from '@/lib/api-auth';

const PROFILE_COLORS: Record<string, string> = {
  '50': '#10b981', // vert émeraude
  '100': '#3b82f6', // bleu royal
  '200': '#8b5cf6', // violet
  '500': '#f59e0b', // ambre
  default: '#64748b', // ardoise
};

export async function POST(req: NextRequest) {
  try {
    const guard = await requireRole(['super_admin', 'admin']);
    if ('response' in guard) return guard.response;

    const body = await req.json().catch(() => ({}));
    const { action = 'sync_profiles', routerId } = body;

    // Récupérer le routeur cible
    const allRtrs = await getAllRouters();
    if (!allRtrs.length) {
      return NextResponse.json(
        { success: false, error: 'Aucun routeur configuré dans NetPulse.' },
        { status: 404 }
      );
    }

    const targetRouter = routerId
      ? allRtrs.find((r) => r.id === routerId)
      : allRtrs[0];

    if (!targetRouter) {
      return NextResponse.json(
        { success: false, error: `Routeur ${routerId} introuvable.` },
        { status: 404 }
      );
    }

    const client = new MikroTikClient({
      host: targetRouter.host,
      port: targetRouter.apiPort,
      user: targetRouter.username,
      password: decryptRouterPassword(targetRouter.passwordEncrypted),
      connectionType: targetRouter.connectionType as 'socket' | 'rest',
      timeout: 8,
    });

    const currentUserId = guard.session.user.id;

    // ──────────────────────────────────────────────────────────────────────────
    // 1. SYNCHRONISATION DES PROFILS UTILISATEURS
    // ──────────────────────────────────────────────────────────────────────────
    if (action === 'sync_profiles') {
      const rosProfiles = await client.getHotspotProfiles();
      let importedCount = 0;
      let updatedCount = 0;

      const syncedProfiles = [];

      for (const p of rosProfiles) {
        // Ignorer ou formater profil par défaut si besoin
        const color = PROFILE_COLORS[p.name] || '#3b82f6';

        const [existing] = await db
          .select()
          .from(hotspotProfiles)
          .where(
            and(
              eq(hotspotProfiles.name, p.name),
              eq(hotspotProfiles.routerId, targetRouter.id)
            )
          )
          .limit(1);

        if (!existing) {
          const [created] = await db
            .insert(hotspotProfiles)
            .values({
              id: `prof_${p.name.toLowerCase()}_${Math.random().toString(36).substring(2, 7)}`,
              routerId: targetRouter.id,
              name: p.name,
              rateLimit: p.rateLimit || 'Illimité',
              sharedUsers: p.sharedUsers || 1,
              price: String(p.price || 0),
              currency: 'FCFA',
              validityMinutes: p.validityMinutes || 1440,
              validityLabel: p.validityLabel || '24 Heures',
              minStockAlert: 15,
              color,
            })
            .returning();

          importedCount++;
          syncedProfiles.push(created);
        } else {
          const [updated] = await db
            .update(hotspotProfiles)
            .set({
              rateLimit: p.rateLimit || existing.rateLimit,
              sharedUsers: p.sharedUsers || existing.sharedUsers,
              validityMinutes: p.validityMinutes || existing.validityMinutes,
              validityLabel: p.validityLabel || existing.validityLabel,
              price: p.price > 0 ? String(p.price) : existing.price,
              updatedAt: new Date(),
            })
            .where(eq(hotspotProfiles.id, existing.id))
            .returning();

          updatedCount++;
          syncedProfiles.push(updated);
        }
      }

      await createAuditLog({
        userId: currentUserId,
        action: 'mikrotik.sync_profiles',
        entityType: 'router',
        entityId: targetRouter.id,
        metadata: {
          routerName: targetRouter.name,
          importedCount,
          updatedCount,
          total: syncedProfiles.length,
        },
      });

      return NextResponse.json({
        success: true,
        action: 'sync_profiles',
        message: `Synchronisation réussie pour ${targetRouter.name} : ${importedCount} profils créés, ${updatedCount} mis à jour.`,
        importedCount,
        updatedCount,
        profiles: syncedProfiles,
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 2. SYNCHRONISATION DES VENTES MIKHMON (/system/script)
    // ──────────────────────────────────────────────────────────────────────────
    if (action === 'sync_sales') {
      const sales = await client.getMikhmonSales();
      if (!sales.length) {
        return NextResponse.json({
          success: true,
          action: 'sync_sales',
          message: 'Aucun enregistrement de vente trouvé sur le routeur.',
          syncedCount: 0,
          totalRevenue: 0,
        });
      }

      // S'assurer que les profils existent en base
      const existingProfiles = await db
        .select()
        .from(hotspotProfiles)
        .where(eq(hotspotProfiles.routerId, targetRouter.id));

      const profileMap = new Map<string, string>();
      for (const p of existingProfiles) {
        profileMap.set(p.name, p.id);
      }

      let syncedCount = 0;
      let totalRevenue = 0;

      for (const sale of sales) {
        if (!sale.username || sale.price <= 0) continue;

        // Trouver ou créer le profil associé
        let profileId = profileMap.get(sale.profile);
        if (!profileId) {
          const [newProf] = await db
            .insert(hotspotProfiles)
            .values({
              id: `prof_${sale.profile.toLowerCase()}_${Math.random().toString(36).substring(2, 7)}`,
              routerId: targetRouter.id,
              name: sale.profile,
              rateLimit: 'Illimité',
              sharedUsers: 1,
              price: String(sale.price),
              currency: 'FCFA',
              validityMinutes: 1440,
              validityLabel: '24 Heures',
              minStockAlert: 15,
              color: PROFILE_COLORS[sale.profile] || '#3b82f6',
            })
            .returning();
          profileId = newProf.id;
          profileMap.set(sale.profile, profileId);
        }

        // Vérifier si le ticket existe déjà dans PostgreSQL
        const [existingTicket] = await db
          .select()
          .from(hotspotTickets)
          .where(
            and(
              eq(hotspotTickets.code, sale.username),
              eq(hotspotTickets.routerId, targetRouter.id)
            )
          )
          .limit(1);

        // Date de la vente
        let soldAtDate = new Date();
        try {
          if (sale.date && sale.time) {
            soldAtDate = new Date(`${sale.date}T${sale.time}`);
          }
        } catch {}

        if (!existingTicket) {
          await db.insert(hotspotTickets).values({
            id: `tkt_sync_${sale.username}_${Math.random().toString(36).substring(2, 6)}`,
            code: sale.username,
            password: sale.username,
            profileId,
            routerId: targetRouter.id,
            price: String(sale.price),
            currency: 'FCFA',
            status: 'used',
            soldAt: soldAtDate,
            activatedAt: soldAtDate,
            soldByUserId: currentUserId,
            isClosed: false,
            batchId: `sync_mikhmon_${sale.date}`,
          });

          syncedCount++;
          totalRevenue += sale.price;
        } else if (existingTicket.status === 'available') {
          // Le ticket existait déjà mais n'était pas marqué comme vendu
          await db
            .update(hotspotTickets)
            .set({
              status: 'used',
              soldAt: soldAtDate,
              activatedAt: soldAtDate,
            })
            .where(eq(hotspotTickets.id, existingTicket.id));

          syncedCount++;
          totalRevenue += sale.price;
        }
      }

      await createAuditLog({
        userId: currentUserId,
        action: 'mikrotik.sync_sales',
        entityType: 'router',
        entityId: targetRouter.id,
        metadata: {
          routerName: targetRouter.name,
          syncedSalesCount: syncedCount,
          totalRevenue,
        },
      });

      return NextResponse.json({
        success: true,
        action: 'sync_sales',
        message: `Synchronisation des ventes réussie : ${syncedCount} ventes importées, Chiffre d'Affaires : ${totalRevenue.toLocaleString()} FCFA.`,
        syncedCount,
        totalRevenue,
        salesCountOnRouter: sales.length,
      });
    }

    return NextResponse.json(
      { success: false, error: `Action "${action}" non supportée.` },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('💥 [MikroTik Sync Error]:', error.message);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
