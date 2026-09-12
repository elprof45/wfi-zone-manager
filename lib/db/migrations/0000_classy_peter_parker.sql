CREATE TYPE "public"."bot_log_type" AS ENUM('incoming_command', 'outgoing_alert', 'closure_report', 'test');--> statement-breakpoint
CREATE TYPE "public"."connection_type" AS ENUM('socket', 'rest');--> statement-breakpoint
CREATE TYPE "public"."notif_channel" AS ENUM('telegram', 'email', 'discord', 'all');--> statement-breakpoint
CREATE TYPE "public"."notif_status" AS ENUM('delivered', 'sent', 'failed');--> statement-breakpoint
CREATE TYPE "public"."notif_type" AS ENUM('daily_report', 'weekly_report', 'monthly_report', 'closure_income', 'critical_stock_alert', 'router_warning');--> statement-breakpoint
CREATE TYPE "public"."router_status" AS ENUM('online', 'offline', 'warning');--> statement-breakpoint
CREATE TYPE "public"."telegram_log_type" AS ENUM('incoming_command', 'outgoing_alert', 'closure_report');--> statement-breakpoint
CREATE TYPE "public"."ticket_status" AS ENUM('available', 'active', 'used', 'expired');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('super_admin', 'admin', 'cashier');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"action" text NOT NULL,
	"entity_type" text,
	"entity_id" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_closures" (
	"id" text PRIMARY KEY NOT NULL,
	"session_code" text NOT NULL,
	"closed_at" timestamp DEFAULT now() NOT NULL,
	"closed_by_user_id" text NOT NULL,
	"router_id" text,
	"router_name" text NOT NULL,
	"total_revenue" numeric(12, 2) NOT NULL,
	"currency" text DEFAULT 'FCFA' NOT NULL,
	"tickets_sold_count" integer NOT NULL,
	"breakdown_json" jsonb NOT NULL,
	"mikrotik_purged_count" integer DEFAULT 0 NOT NULL,
	"email_sent" boolean DEFAULT false NOT NULL,
	"telegram_sent" boolean DEFAULT false NOT NULL,
	"notes" text,
	CONSTRAINT "daily_closures_session_code_unique" UNIQUE("session_code")
);
--> statement-breakpoint
CREATE TABLE "discord_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"type" "bot_log_type" NOT NULL,
	"command" text,
	"text" text NOT NULL,
	"guild_id" text,
	"channel_id" text,
	"status" "notif_status" DEFAULT 'sent' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hotspot_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"router_id" text,
	"name" text NOT NULL,
	"rate_limit" text NOT NULL,
	"shared_users" integer DEFAULT 1 NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"currency" text DEFAULT 'FCFA' NOT NULL,
	"validity_minutes" integer NOT NULL,
	"validity_label" text NOT NULL,
	"min_stock_alert" integer DEFAULT 15 NOT NULL,
	"color" text DEFAULT '#3b82f6' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hotspot_tickets" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"password" text,
	"profile_id" text NOT NULL,
	"router_id" text NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"currency" text DEFAULT 'FCFA' NOT NULL,
	"status" "ticket_status" DEFAULT 'available' NOT NULL,
	"batch_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"sold_at" timestamp,
	"sold_by_user_id" text,
	"activated_at" timestamp,
	"expires_at" timestamp,
	"is_closed" boolean DEFAULT false NOT NULL,
	"closure_id" text,
	CONSTRAINT "hotspot_tickets_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "notification_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"type" "notif_type" NOT NULL,
	"channel" "notif_channel" NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"recipient" text NOT NULL,
	"status" "notif_status" NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"revenue_amount" numeric(12, 2),
	"tickets_count" integer
);
--> statement-breakpoint
CREATE TABLE "routers" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"location" text NOT NULL,
	"host" text NOT NULL,
	"api_port" integer DEFAULT 8728 NOT NULL,
	"connection_type" "connection_type" DEFAULT 'socket' NOT NULL,
	"username" text NOT NULL,
	"password_encrypted" text,
	"hotspot_dns_name" text DEFAULT 'hotspot.wifi' NOT NULL,
	"status" "router_status" DEFAULT 'offline' NOT NULL,
	"last_seen_at" timestamp,
	"hardware_json" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"impersonated_by" text,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "telegram_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"type" "telegram_log_type" NOT NULL,
	"command" text,
	"text" text NOT NULL,
	"status" "notif_status" DEFAULT 'sent' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" "user_role" DEFAULT 'cashier' NOT NULL,
	"banned" boolean DEFAULT false,
	"ban_reason" text,
	"ban_expires" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_closures" ADD CONSTRAINT "daily_closures_closed_by_user_id_users_id_fk" FOREIGN KEY ("closed_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hotspot_profiles" ADD CONSTRAINT "hotspot_profiles_router_id_routers_id_fk" FOREIGN KEY ("router_id") REFERENCES "public"."routers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hotspot_tickets" ADD CONSTRAINT "hotspot_tickets_profile_id_hotspot_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."hotspot_profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hotspot_tickets" ADD CONSTRAINT "hotspot_tickets_router_id_routers_id_fk" FOREIGN KEY ("router_id") REFERENCES "public"."routers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hotspot_tickets" ADD CONSTRAINT "hotspot_tickets_sold_by_user_id_users_id_fk" FOREIGN KEY ("sold_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;