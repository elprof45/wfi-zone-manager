DROP TABLE "slack_logs" CASCADE;--> statement-breakpoint
DROP TABLE "whatsapp_logs" CASCADE;--> statement-breakpoint
UPDATE "notification_logs" SET "channel" = 'discord' WHERE "channel" IN ('slack', 'whatsapp');--> statement-breakpoint
ALTER TABLE "notification_logs" ALTER COLUMN "channel" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."notif_channel";--> statement-breakpoint
CREATE TYPE "public"."notif_channel" AS ENUM('telegram', 'email', 'discord', 'all');--> statement-breakpoint
ALTER TABLE "notification_logs" ALTER COLUMN "channel" SET DATA TYPE "public"."notif_channel" USING "channel"::"public"."notif_channel";