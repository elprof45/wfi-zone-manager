// app/api/mikrotik/terminal/route.ts
// Exécution sécurisée de commandes RouterOS en direct (CLI Terminal Web)

import { NextRequest, NextResponse } from 'next/server';
import { getAllRouters } from '@/lib/db/queries/routers';
import { MikrotikAPI } from '@fibercom/routeros-api';
import { createAuditLog } from '@/lib/db/queries/audit';
import { requireRole } from '@/lib/api-auth';

// Liste de commandes bloquées par sécurité (commandes destructives non autorisées via terminal web)
const FORBIDDEN_COMMANDS = [
  '/system reset-configuration',
  '/system/reset-configuration',
  '/user remove',
  '/user/remove',
];

export async function POST(req: NextRequest) {
  try {
    const guard = await requireRole(['super_admin', 'admin']);
    if ('response' in guard) return guard.response;

    const body = await req.json().catch(() => ({}));
    const { routerId, command } = body;

    if (!command || typeof command !== 'string' || !command.trim()) {
      return NextResponse.json({ success: false, error: 'Commande RouterOS obligatoire.' }, { status: 400 });
    }

    const cleanCommand = command.trim();

    // Vérification sécurité
    for (const forbidden of FORBIDDEN_COMMANDS) {
      if (cleanCommand.toLowerCase().includes(forbidden)) {
        return NextResponse.json(
          { success: false, error: `Action interdite : la commande "${forbidden}" est verrouillée pour des raisons de sécurité.` },
          { status: 403 }
        );
      }
    }

    // Récupération du routeur
    const allRtrs = await getAllRouters();
    if (!allRtrs.length) {
      return NextResponse.json({ success: false, error: 'Aucun routeur configuré.' }, { status: 404 });
    }

    const targetRouter = routerId
      ? allRtrs.find((r) => r.id === routerId)
      : allRtrs[0];

    if (!targetRouter) {
      return NextResponse.json({ success: false, error: 'Routeur introuvable.' }, { status: 404 });
    }

    const startTime = Date.now();

    // Connexion via Socket API (Port 8728) pour support direct de toutes les syntaxes RouterOS
    const api = new MikrotikAPI({
      host: targetRouter.host,
      port: targetRouter.apiPort,
      user: targetRouter.username,
      password: targetRouter.passwordEncrypted ?? '',
      timeout: 10,
    });

    try {
      await api.connect();

      // Découper la commande en mots selon la convention RouterOS API
      // Ex: "/ip hotspot user print where profile=50" -> ["/ip/hotspot/user/print", "?profile=50"]
      const parts = cleanCommand.split(/\s+/).filter(Boolean);
      let cmdPath = parts[0];
      if (!cmdPath.startsWith('/')) {
        cmdPath = '/' + cmdPath;
      }

      // Convertir la commande RouterOS en chemin API standard si des espaces étaient utilisés
      // Ex: "/ip hotspot active print" -> "/ip/hotspot/active/print"
      const apiArgs: string[] = [];
      let finalPath = cmdPath;

      if (parts.length > 1) {
        // Détecter si les premiers tokens forment un chemin (ex: "/ip" "hotspot" "user" "print")
        const pathSegments: string[] = [];
        let argIndex = 0;
        for (let i = 0; i < parts.length; i++) {
          const p = parts[i];
          if (!p.startsWith('=') && !p.startsWith('?') && !p.includes('=')) {
            pathSegments.push(p.replace(/^\//, ''));
            argIndex = i + 1;
          } else {
            break;
          }
        }

        if (pathSegments.length > 1) {
          finalPath = '/' + pathSegments.join('/');
          for (let i = argIndex; i < parts.length; i++) {
            const rawArg = parts[i];
            // Format RouterOS API param: =param=value ou ?param=value
            if (rawArg.startsWith('=') || rawArg.startsWith('?')) {
              apiArgs.push(rawArg);
            } else if (rawArg.includes('=')) {
              apiArgs.push(`=${rawArg}`);
            } else {
              apiArgs.push(rawArg);
            }
          }
        } else {
          // Arguments directs
          for (let i = 1; i < parts.length; i++) {
            const rawArg = parts[i];
            if (rawArg.startsWith('=') || rawArg.startsWith('?')) {
              apiArgs.push(rawArg);
            } else if (rawArg.includes('=')) {
              apiArgs.push(`=${rawArg}`);
            } else {
              apiArgs.push(rawArg);
            }
          }
        }
      }

      // Exécution de la commande
      const rawOutput = apiArgs.length > 0
        ? await api.write([finalPath, ...apiArgs])
        : await api.write(finalPath);

      await api.close();

      const elapsed = Date.now() - startTime;

      // Audit log
      await createAuditLog({
        userId: guard.session.user.id,
        action: 'router.command',
        entityType: 'router',
        entityId: targetRouter.id,
        metadata: {
          command: cleanCommand,
          finalPath,
          apiArgs,
          elapsedMs: elapsed,
          routerName: targetRouter.name,
        },
      });

      return NextResponse.json({
        success: true,
        command: cleanCommand,
        executedPath: finalPath,
        args: apiArgs,
        elapsedMs: elapsed,
        output: rawOutput,
        outputCount: Array.isArray(rawOutput) ? rawOutput.length : 1,
      });
    } catch (apiErr: any) {
      try { await api.close(); } catch {}
      return NextResponse.json({
        success: false,
        command: cleanCommand,
        error: apiErr.message || String(apiErr),
        elapsedMs: Date.now() - startTime,
      }, { status: 500 });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
