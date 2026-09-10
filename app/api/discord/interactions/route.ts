// app/api/discord/interactions/route.ts
// Discord Interactions endpoint — handles slash commands and button interactions
// Discord sends signed POST requests to this URL
// Register this endpoint in your Discord Developer Portal under:
//   Application → General Information → Interactions Endpoint URL

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { discordLogs } from '@/lib/db/schema';
import { nanoid } from '@/lib/db/utils';
import { generateSalesReportSummary } from '@/lib/reports-service';

// Discord interaction types
const PING = 1;
const APPLICATION_COMMAND = 2;

// Discord response types
const PONG = 1;
const CHANNEL_MESSAGE_WITH_SOURCE = 4;

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
    console.warn('[Discord] DISCORD_PUBLIC_KEY not set — skipping signature verification (dev mode)');
    return true; // skip in dev if not configured
  }

  const signature = req.headers.get('x-signature-ed25519');
  const timestamp = req.headers.get('x-signature-timestamp');

  if (!signature || !timestamp) return false;

  try {
    const encoder = new TextEncoder();
    const keyBytes = hexToBytes(publicKey);
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBytes,
      { name: 'Ed25519', namedCurve: 'Ed25519' },
      false,
      ['verify']
    );

    const isValid = await crypto.subtle.verify(
      'Ed25519',
      cryptoKey,
      hexToBytes(signature),
      encoder.encode(timestamp + rawBody)
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
    type: CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content,
      flags: ephemeral ? 64 : 0, // 64 = ephemeral (only visible to command invoker)
    },
  });
}

function discordEmbedResponse(embeds: any[]) {
  return NextResponse.json({
    type: CHANNEL_MESSAGE_WITH_SOURCE,
    data: { embeds },
  });
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  // Verify signature
  const isValid = await verifyDiscordSignature(req, rawBody);
  if (!isValid) {
    return new NextResponse('Invalid request signature', { status: 401 });
  }

  const body = JSON.parse(rawBody);

  // Handle Discord PING (required for endpoint validation)
  if (body.type === PING) {
    return NextResponse.json({ type: PONG });
  }

  // Handle slash commands
  if (body.type === APPLICATION_COMMAND) {
    const commandName = body.data?.name as string;
    const userId = body.member?.user?.id || body.user?.id;

    // Log incoming command
    await db.insert(discordLogs).values({
      id: `dc_cmd_${nanoid()}`,
      timestamp: new Date(),
      type: 'incoming_command',
      command: commandName,
      text: `/${commandName} from user ${userId}`,
      guildId: body.guild_id,
      channelId: body.channel_id,
      status: 'delivered',
    }).catch(console.error);

    switch (commandName) {
      case 'stats':
      case 'rapport': {
        try {
          const report = await generateSalesReportSummary('daily');
          const embed = {
            title: '📊 Rapport du Jour — NetPulse',
            color: 0x5865f2,
            fields: [
              { name: '💰 Revenus', value: `**${report.totalRevenue.toLocaleString()} ${report.currency}**`, inline: true },
              { name: '🎟️ Tickets vendus', value: `**${report.ticketsCount}**`, inline: true },
              { name: '📈 vs hier', value: report.comparisonVsPreviousPercent >= 0 ? `+${report.comparisonVsPreviousPercent.toFixed(1)}%` : `${report.comparisonVsPreviousPercent.toFixed(1)}%`, inline: true },
            ],
            footer: { text: 'NetPulse Hotspot Manager' },
            timestamp: new Date().toISOString(),
          };
          return discordEmbedResponse([embed]);
        } catch {
          return discordResponse('❌ Erreur lors de la génération du rapport.', true);
        }
      }

      case 'status': {
        return discordResponse(
          `🟢 **NetPulse Hotspot Manager** — En ligne\n⏰ ${new Date().toLocaleString('fr-FR')}`
        );
      }

      case 'aide':
      case 'help': {
        return discordResponse(
          [
            '📡 **Commandes NetPulse disponibles:**',
            '`/stats` — Rapport des ventes du jour',
            '`/rapport` — Même chose que /stats',
            '`/status` — Statut du serveur',
            '`/aide` — Afficher cette aide',
          ].join('\n'),
          true
        );
      }

      default:
        return discordResponse(`❓ Commande \`/${commandName}\` non reconnue. Tapez \`/aide\` pour la liste.`, true);
    }
  }

  return NextResponse.json({ error: 'Unknown interaction type' }, { status: 400 });
}
