// app/api/discord/interactions/route.ts
// Official Discord HTTP Interactions Endpoint using discord.js and discord-api-types
// Discord Developer Portal: Application → General Information → Interactions Endpoint URL

import { NextRequest, NextResponse } from 'next/server';
import { EmbedBuilder } from 'discord.js';
import {
  InteractionType,
  InteractionResponseType,
  MessageFlags,
  type APIInteraction,
} from 'discord-api-types/v10';
import { db } from '@/lib/db';
import { discordLogs, routers, hotspotTickets, hotspotProfiles } from '@/lib/db/schema';
import { nanoid } from '@/lib/db/utils';
import { generateSalesReportSummary } from '@/lib/reports-service';
import { sql } from 'drizzle-orm';

/**
 * Verify Discord Ed25519 signature using Web Crypto API
 * Required by Discord — requests without valid signature return 401
 */
async function verifyDiscordSignature(
  req: NextRequest,
  rawBody: string
): Promise<boolean> {
  const publicKey = process.env.DISCORD_PUBLIC_KEY;
  if (!publicKey) {
    console.warn('[Discord] DISCORD_PUBLIC_KEY non renseigné — contournement en mode dev local');
    return true;
  }

  const signature = req.headers.get('x-signature-ed25519');
  const timestamp = req.headers.get('x-signature-timestamp');

  if (!signature || !timestamp) return false;

  try {
    const encoder = new TextEncoder();
    const keyBytes = hexToBytes(publicKey.trim());
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBytes as unknown as BufferSource,
      { name: 'Ed25519', namedCurve: 'Ed25519' },
      false,
      ['verify']
    );

    const isValid = await crypto.subtle.verify(
      'Ed25519',
      cryptoKey,
      hexToBytes(signature.trim()) as unknown as BufferSource,
      encoder.encode(timestamp + rawBody) as unknown as BufferSource
    );
    return isValid;
  } catch {
    return false;
  }
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

function discordResponse(content: string, ephemeral = false) {
  return NextResponse.json({
    type: InteractionResponseType.ChannelMessageWithSource,
    data: {
      content,
      flags: ephemeral ? MessageFlags.Ephemeral : 0,
    },
  });
}

function discordEmbedResponse(embeds: any[], ephemeral = false) {
  return NextResponse.json({
    type: InteractionResponseType.ChannelMessageWithSource,
    data: {
      embeds: embeds.map((e) => (typeof e.toJSON === 'function' ? e.toJSON() : e)),
      flags: ephemeral ? MessageFlags.Ephemeral : 0,
    },
  });
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  // 1. Verify Discord Request Signature
  const isValid = await verifyDiscordSignature(req, rawBody);
  if (!isValid) {
    return new NextResponse('Invalid request signature', { status: 401 });
  }

  let body: APIInteraction;
  try {
    body = JSON.parse(rawBody) as APIInteraction;
  } catch {
    return new NextResponse('Invalid JSON', { status: 400 });
  }

  // 2. Handle Discord PING (Required for endpoint registration and liveness checks)
  if (body.type === InteractionType.Ping) {
    return NextResponse.json({ type: InteractionResponseType.Pong });
  }

  // 3. Handle Application Slash Commands
  if (body.type === InteractionType.ApplicationCommand) {
    const commandName = body.data.name;
    const userId = body.member?.user?.id || body.user?.id;

    // Log incoming interaction in PostgreSQL
    await db.insert(discordLogs).values({
      id: `dc_cmd_${nanoid()}`,
      timestamp: new Date(),
      type: 'incoming_command',
      command: commandName,
      text: `/${commandName} invoqué par l'utilisateur Discord ${userId}`,
      guildId: body.guild_id,
      channelId: body.channel_id,
      status: 'delivered',
    }).catch(console.error);

    switch (commandName) {
      case 'stats':
      case 'rapport': {
        try {
          const report = await generateSalesReportSummary('daily');

          const embed = new EmbedBuilder()
            .setTitle('📊 Rapport Financier Journalier — NetPulse')
            .setColor(0x5865f2)
            .setDescription('Résumé automatique des ventes et tickets de la journée en cours.')
            .addFields(
              {
                name: '💰 Chiffre d’Affaires',
                value: `**${report.totalRevenue.toLocaleString()} ${report.currency}**`,
                inline: true,
              },
              {
                name: '🎟️ Tickets Vendus',
                value: `**${report.ticketsCount}**`,
                inline: true,
              },
              {
                name: '📈 Évolution vs Hier',
                value:
                  report.comparisonVsPreviousPercent >= 0
                    ? `+${report.comparisonVsPreviousPercent.toFixed(1)}%`
                    : `${report.comparisonVsPreviousPercent.toFixed(1)}%`,
                inline: true,
              }
            )
            .setFooter({ text: 'NetPulse Hotspot Manager v2.5' })
            .setTimestamp();

          return discordEmbedResponse([embed]);
        } catch {
          return discordResponse('❌ Impossible de générer le rapport financier.', true);
        }
      }

      case 'status': {
        try {
          const [routersList, [{ totalTickets }]] = await Promise.all([
            db.select().from(routers),
            db.select({ totalTickets: sql<number>`count(*)::int` }).from(hotspotTickets),
          ]);

          const onlineCount = routersList.filter((r) => r.status === 'online').length;

          const embed = new EmbedBuilder()
            .setTitle('🟢 Statut Infrastructure — NetPulse Hotspot')
            .setColor(0x57f287)
            .addFields(
              {
                name: '📡 Routeurs MikroTik',
                value: `${onlineCount}/${routersList.length} en ligne`,
                inline: true,
              },
              {
                name: '🎟️ Tickets en Base',
                value: `${totalTickets.toLocaleString()} tickets`,
                inline: true,
              },
              {
                name: '⚡ Moteur SaaS',
                value: 'RouterOS Socket API • Opérationnel',
                inline: true,
              }
            )
            .setFooter({ text: 'NetPulse Core Engine' })
            .setTimestamp();

          return discordEmbedResponse([embed]);
        } catch {
          return discordResponse('🟢 **NetPulse Hotspot Manager** en ligne.\n⏰ ' + new Date().toLocaleString('fr-FR'));
        }
      }

      case 'info': {
        try {
          const [rtr] = await db.select().from(routers).limit(1);
          if (!rtr) {
            return discordResponse('⚠️ Aucun routeur configuré dans NetPulse.', true);
          }
          const hw = (rtr.hardwareJson as any) || {};
          const embed = new EmbedBuilder()
            .setTitle(`📡 Télémétrie MikroTik — ${rtr.name}`)
            .setColor(rtr.status === 'online' ? 0x57f287 : 0xed4245)
            .setDescription(`Hôte : \`${rtr.host}:${rtr.apiPort}\` (${rtr.connectionType.toUpperCase()})`)
            .addFields(
              { name: 'Modèle & OS', value: `${hw.model || 'MikroTik'} (${hw.version || 'v7'})`, inline: true },
              { name: 'Charge CPU', value: `${hw.cpuPercent || 0}%`, inline: true },
              { name: 'Mémoire Libre', value: `${hw.ramFreeMb || 0} Mo / ${hw.ramTotalMb || 128} Mo`, inline: true },
              { name: 'Sessions Actives', value: `👥 **${hw.activeUsersCount ?? 0}** connectés`, inline: true },
              { name: 'Uptime', value: hw.uptime || 'N/A', inline: true },
              { name: 'Statut', value: rtr.status === 'online' ? '🟢 En Ligne' : '🔴 Hors Ligne', inline: true }
            )
            .setFooter({ text: 'NetPulse Hotspot Telemetry' })
            .setTimestamp();

          return discordEmbedResponse([embed]);
        } catch (e: any) {
          return discordResponse(`❌ Erreur info routeur: ${e.message}`, true);
        }
      }

      case 'ventes': {
        try {
          const report = await generateSalesReportSummary('daily');
          const lines = report.profileBreakdown.map(
            (p) => `• **${p.profileName}** : ${p.count} ventes → **${p.revenue.toLocaleString()} ${report.currency}**`
          );

          const embed = new EmbedBuilder()
            .setTitle(`💰 Ventes du Jour — ${report.totalRevenue.toLocaleString()} ${report.currency}`)
            .setColor(0x57f287)
            .setDescription(lines.length ? lines.join('\n') : 'Aucune vente enregistrée aujourd’hui.')
            .addFields(
              { name: 'Total Tickets', value: `${report.ticketsCount} tickets`, inline: true },
              { name: 'Non Clôturé', value: `${report.unclosedRevenue.toLocaleString()} ${report.currency}`, inline: true }
            )
            .setFooter({ text: 'NetPulse Point of Sale' })
            .setTimestamp();

          return discordEmbedResponse([embed]);
        } catch (e: any) {
          return discordResponse(`❌ Erreur ventes: ${e.message}`, true);
        }
      }

      case 'stock': {
        try {
          const profilesList = await db.select().from(routers).limit(1);
          const availableTickets = await db
            .select({
              profileId: hotspotTickets.profileId,
              count: sql<number>`count(*)::int`,
            })
            .from(hotspotTickets)
            .where(sql`${hotspotTickets.status} = 'available'`)
            .groupBy(hotspotTickets.profileId);

          const countMap = new Map(availableTickets.map((a) => [a.profileId, a.count]));

          const allProfiles = await db.select().from(hotspotProfiles);
          const fields = allProfiles.map((p) => {
            const count = countMap.get(p.id) || 0;
            const isCritical = count < p.minStockAlert;
            return {
              name: `${p.name} (${p.price} ${p.currency})`,
              value: `${isCritical ? '⚠️ **' : '**'}${count} tickets restants** (Seuil: ${p.minStockAlert})`,
              inline: true,
            };
          });

          const embed = new EmbedBuilder()
            .setTitle('📦 État des Stocks de Tickets NetPulse')
            .setColor(fields.some((f) => f.value.includes('⚠️')) ? 0xfee75c : 0x5865f2)
            .setDescription('Inventaire des fiches prêtes à la vente sur le serveur :')
            .addFields(fields.length ? fields : [{ name: 'Profils', value: 'Aucun profil configuré.' }])
            .setFooter({ text: 'NetPulse Stock Watcher' })
            .setTimestamp();

          return discordEmbedResponse([embed]);
        } catch (e: any) {
          return discordResponse(`❌ Erreur stock: ${e.message}`, true);
        }
      }

      case 'cloture': {
        return discordResponse(
          '🏦 **Clôture de Caisse NetPulse :** Rendez-vous sur votre tableau de bord pour effectuer la clôture infalsifiable du jour : http://localhost:3000/#closure'
        );
      }

      case 'aide':
      case 'help': {
        const embed = new EmbedBuilder()
          .setTitle('🤖 Guide des Commandes Discord NetPulse')
          .setColor(0x5865f2)
          .setDescription('Commandes slash pour superviser votre hotspot MikroTik :')
          .addFields(
            { name: '`/stats` ou `/rapport`', value: 'Chiffre d’affaires et tickets vendus aujourd’hui.' },
            { name: '`/ventes`', value: 'Détail des ventes ventilé par profil et tarif.' },
            { name: '`/stock`', value: 'Quantité de tickets restants en rayon et alertes stock.' },
            { name: '`/info`', value: 'Télémétrie MikroTik : CPU, RAM, Uptime et sessions actives.' },
            { name: '`/status`', value: 'État global de l’infrastructure et des routeurs.' },
            { name: '`/cloture`', value: 'Lien direct vers la clôture de caisse.' }
          )
          .setFooter({ text: 'NetPulse Bot v2.5' });

        return discordEmbedResponse([embed], true);
      }

      default:
        return discordResponse(
          `❓ Commande inconnue \`/${commandName}\`. Tapez \`/aide\` pour consulter les commandes valides.`,
          true
        );
    }
  }

  return NextResponse.json({ error: 'Type d’interaction non supporté' }, { status: 400 });
}
