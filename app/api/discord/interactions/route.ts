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
import { discordLogs, routers, hotspotTickets } from '@/lib/db/schema';
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
          .setDescription('Liste des commandes slash disponibles pour superviser votre réseau Hotspot :')
          .addFields(
            { name: '`/stats` ou `/rapport`', value: 'Affiche le chiffre d’affaires et les tickets vendus aujourd’hui.' },
            { name: '`/status`', value: 'Vérifie la santé des routeurs MikroTik et du serveur central.' },
            { name: '`/cloture`', value: 'Fournit le statut de clôture de caisse courante.' },
            { name: '`/aide`', value: 'Affiche ce message d’aide.' }
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
