# NetPulse Hotspot Manager

NetPulse est une console de gestion pour réseaux hotspot MikroTik : routeurs, profils, génération et vente de tickets, clôtures de caisse, rapports et notifications multicanal.

## Prérequis

- Bun 1.1+ ou Node.js 20+
- PostgreSQL 16+
- RouterOS v6/v7 pour les intégrations réseau

## Installation locale

```bash
bun install
cp .env.example .env
docker compose up -d postgres
bun run db:push
bun run dev
```

Ouvrir `http://localhost:3000/setup` pour terminer la configuration initiale.

## Variables obligatoires

```env
DATABASE_URL="postgresql://..."
BETTER_AUTH_SECRET="secret-long-et-aleatoire"
ROUTER_CREDENTIALS_KEY="64-caracteres-hexadecimaux"
MIKROTIK_HEARTBEAT_TOKEN="token-long-et-aleatoire"
```

`ROUTER_CREDENTIALS_KEY` encode une clé AES-256. Sa perte empêche le déchiffrement des credentials MikroTik existantes.

`MIKROTIK_HEARTBEAT_TOKEN` authentifie les métriques poussées par les routeurs. Le script RouterOS généré par NetPulse l’utilise automatiquement.

En production, ces secrets ne doivent jamais être laissés vides ni committés dans Git.

## Commandes utiles

```bash
bun run dev
bun run build
bun run start
bun run lint
bun run test
bunx tsc --noEmit
bun run db:generate
bun run db:migrate
bun run worker:cron
```

## Sécurité

- Les APIs métier exigent une session Better Auth.
- Les opérations d’administration sont réservées à `admin` et `super_admin`.
- Le setup public est limité au bootstrap avant le premier utilisateur.
- Les mots de passe MikroTik sont chiffrés avec AES-256-GCM.
- Le heartbeat routeur exige `MIKROTIK_HEARTBEAT_TOKEN`.
- Le terminal MikroTik et les tâches cron sont réservés aux administrateurs.

Avant exposition Internet, configurer HTTPS, un reverse proxy, des sauvegardes PostgreSQL et une rotation documentée des secrets.

## Architecture

- `app/` : pages Next.js et routes API
- `components/` : vues opérationnelles et navigation
- `lib/db/` : schéma, migrations et requêtes Drizzle
- `lib/mikrotik/` : clients RouterOS socket/REST et pool de connexions
- `lib/notifications/` : Telegram, Discord HTTP et email
- `scripts/` : worker cron et scripts RouterOS

## Déploiement production

1. Utiliser des secrets injectés par l’environnement ou un secret manager.
2. Ne pas exposer PostgreSQL publiquement.
3. Exécuter les migrations avant le démarrage de l’application.
4. Exécuter le cron dans un worker séparé avec `ENABLE_BACKGROUND_CRON=false` côté serveur web.
5. Activer les logs structurés, les sauvegardes et la surveillance de disponibilité.
