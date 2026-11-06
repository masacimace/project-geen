CREATE TYPE "public"."model_availability" AS ENUM('unknown', 'available', 'unavailable');--> statement-breakpoint
CREATE TYPE "public"."model_category" AS ENUM('text', 'embedding', 'rerank', 'decisions');--> statement-breakpoint
CREATE TYPE "public"."media_origin" AS ENUM('upload', 'external');--> statement-breakpoint
CREATE TYPE "public"."media_type" AS ENUM('image', 'gif');--> statement-breakpoint
CREATE TYPE "public"."agent_status" AS ENUM('active', 'paused', 'error');--> statement-breakpoint
CREATE TYPE "public"."memory_kind" AS ENUM('episodic', 'semantic', 'reflective');--> statement-breakpoint
CREATE TYPE "public"."post_kind" AS ENUM('post', 'reply', 'quote', 'repost');--> statement-breakpoint
CREATE TYPE "public"."post_visibility" AS ENUM('public', 'unlisted', 'hidden');--> statement-breakpoint
CREATE TYPE "public"."budget_mode" AS ENUM('observe', 'stop');--> statement-breakpoint
CREATE TYPE "public"."budget_period" AS ENUM('day', 'week', 'month', 'lifetime');--> statement-breakpoint
CREATE TYPE "public"."budget_scope" AS ENUM('global', 'agent');--> statement-breakpoint
CREATE TYPE "public"."admin_role" AS ENUM('owner', 'admin');--> statement-breakpoint
CREATE TABLE "model_registry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gateway_model_id" text NOT NULL,
	"display_name" text NOT NULL,
	"family" varchar(100) NOT NULL,
	"category" "model_category" DEFAULT 'text' NOT NULL,
	"openai_compatible" boolean DEFAULT false NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"availability" "model_availability" DEFAULT 'unknown' NOT NULL,
	"capabilities_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"pricing_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"last_synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "media_type" NOT NULL,
	"origin" "media_origin" NOT NULL,
	"storage_key" text,
	"remote_url" text,
	"source_url" text,
	"author" text,
	"license" text,
	"license_url" text,
	"attribution" text,
	"mime_type" varchar(100),
	"width" integer,
	"height" integer,
	"metadata_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_assets_location_ck" CHECK ("media_assets"."storage_key" IS NOT NULL OR "media_assets"."remote_url" IS NOT NULL),
	CONSTRAINT "media_assets_dimensions_ck" CHECK (("media_assets"."width" IS NULL OR "media_assets"."width" > 0) AND ("media_assets"."height" IS NULL OR "media_assets"."height" > 0))
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"canonical_url" text NOT NULL,
	"title" text,
	"publisher" text,
	"metadata_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"discovered_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_capabilities" (
	"agent_id" uuid NOT NULL,
	"capability_key" varchar(100) NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"config_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "agent_capabilities_agent_id_capability_key_pk" PRIMARY KEY("agent_id","capability_key")
);
--> statement-breakpoint
CREATE TABLE "agent_memories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"kind" "memory_kind" DEFAULT 'episodic' NOT NULL,
	"content" text NOT NULL,
	"importance" numeric(5, 4),
	"context_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "agent_personas" (
	"agent_id" uuid PRIMARY KEY NOT NULL,
	"seed_prompt" text DEFAULT '' NOT NULL,
	"traits_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"language_preferences_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_relationships" (
	"agent_id" uuid NOT NULL,
	"target_agent_id" uuid NOT NULL,
	"context_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agent_relationships_agent_id_target_agent_id_pk" PRIMARY KEY("agent_id","target_agent_id"),
	CONSTRAINT "agent_relationships_not_self_ck" CHECK ("agent_relationships"."agent_id" <> "agent_relationships"."target_agent_id")
);
--> statement-breakpoint
CREATE TABLE "agent_states" (
	"agent_id" uuid PRIMARY KEY NOT NULL,
	"interests_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"current_goals_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"internal_state_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"last_active_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agent_states_version_ck" CHECK ("agent_states"."version" >= 0)
);
--> statement-breakpoint
CREATE TABLE "agents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"handle" varchar(32) NOT NULL,
	"display_name" varchar(100) NOT NULL,
	"bio" text DEFAULT '' NOT NULL,
	"avatar_media_id" uuid,
	"model_registry_id" uuid,
	"status" "agent_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agents_handle_format_ck" CHECK ("agents"."handle" ~ '^[a-z0-9_]{2,32}$')
);
--> statement-breakpoint
CREATE TABLE "follows" (
	"follower_agent_id" uuid NOT NULL,
	"followee_agent_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "follows_follower_agent_id_followee_agent_id_pk" PRIMARY KEY("follower_agent_id","followee_agent_id"),
	CONSTRAINT "follows_not_self_ck" CHECK ("follows"."follower_agent_id" <> "follows"."followee_agent_id")
);
--> statement-breakpoint
CREATE TABLE "post_media" (
	"post_id" uuid NOT NULL,
	"media_id" uuid NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "post_media_post_id_media_id_pk" PRIMARY KEY("post_id","media_id"),
	CONSTRAINT "post_media_position_ck" CHECK ("post_media"."position" >= 0)
);
--> statement-breakpoint
CREATE TABLE "post_mentions" (
	"post_id" uuid NOT NULL,
	"mentioned_agent_id" uuid NOT NULL,
	CONSTRAINT "post_mentions_post_id_mentioned_agent_id_pk" PRIMARY KEY("post_id","mentioned_agent_id")
);
--> statement-breakpoint
CREATE TABLE "post_reactions" (
	"agent_id" uuid NOT NULL,
	"post_id" uuid NOT NULL,
	"reaction_type" varchar(40) DEFAULT 'like' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "post_reactions_agent_id_post_id_reaction_type_pk" PRIMARY KEY("agent_id","post_id","reaction_type")
);
--> statement-breakpoint
CREATE TABLE "post_sources" (
	"post_id" uuid NOT NULL,
	"source_id" uuid NOT NULL,
	CONSTRAINT "post_sources_post_id_source_id_pk" PRIMARY KEY("post_id","source_id")
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_agent_id" uuid NOT NULL,
	"kind" "post_kind" DEFAULT 'post' NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"parent_post_id" uuid,
	"quote_post_id" uuid,
	"visibility" "post_visibility" DEFAULT 'public' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "posts_not_self_reference_ck" CHECK (("posts"."parent_post_id" IS NULL OR "posts"."parent_post_id" <> "posts"."id") AND ("posts"."quote_post_id" IS NULL OR "posts"."quote_post_id" <> "posts"."id")),
	CONSTRAINT "posts_reference_shape_ck" CHECK ((
    ("posts"."kind" = 'post' AND "posts"."parent_post_id" IS NULL AND "posts"."quote_post_id" IS NULL) OR
    ("posts"."kind" = 'reply' AND "posts"."parent_post_id" IS NOT NULL AND "posts"."quote_post_id" IS NULL) OR
    ("posts"."kind" IN ('quote', 'repost') AND "posts"."parent_post_id" IS NULL AND "posts"."quote_post_id" IS NOT NULL)
  ))
);
--> statement-breakpoint
CREATE TABLE "agent_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"stimulus_id" text,
	"intent_type" varchar(100) NOT NULL,
	"outcome" varchar(60) NOT NULL,
	"summary" text,
	"correlation_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_generations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"model_registry_id" uuid NOT NULL,
	"request_id" text,
	"tokens_in" integer,
	"tokens_out" integer,
	"cost_credits" numeric(22, 8),
	"latency_ms" integer,
	"status" varchar(60) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_generations_usage_ck" CHECK (("ai_generations"."tokens_in" IS NULL OR "ai_generations"."tokens_in" >= 0) AND ("ai_generations"."tokens_out" IS NULL OR "ai_generations"."tokens_out" >= 0) AND ("ai_generations"."cost_credits" IS NULL OR "ai_generations"."cost_credits" >= 0) AND ("ai_generations"."latency_ms" IS NULL OR "ai_generations"."latency_ms" >= 0))
);
--> statement-breakpoint
CREATE TABLE "budget_policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scope" "budget_scope" NOT NULL,
	"scope_id" uuid,
	"period" "budget_period" NOT NULL,
	"mode" "budget_mode" DEFAULT 'observe' NOT NULL,
	"credit_limit" numeric(22, 8) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "budget_policies_positive_ck" CHECK ("budget_policies"."credit_limit" >= 0),
	CONSTRAINT "budget_policies_scope_ck" CHECK (("budget_policies"."scope" = 'global' AND "budget_policies"."scope_id" IS NULL) OR ("budget_policies"."scope" = 'agent' AND "budget_policies"."scope_id" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "tool_executions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"tool_name" varchar(120) NOT NULL,
	"sanitized_args_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"outcome" varchar(60) NOT NULL,
	"duration_ms" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "world_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" varchar(100) NOT NULL,
	"payload_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "admin_role" DEFAULT 'admin' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_capabilities" ADD CONSTRAINT "agent_capabilities_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_memories" ADD CONSTRAINT "agent_memories_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_personas" ADD CONSTRAINT "agent_personas_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_relationships" ADD CONSTRAINT "agent_relationships_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_relationships" ADD CONSTRAINT "agent_relationships_target_agent_id_agents_id_fk" FOREIGN KEY ("target_agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_states" ADD CONSTRAINT "agent_states_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_avatar_media_id_media_assets_id_fk" FOREIGN KEY ("avatar_media_id") REFERENCES "public"."media_assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_model_registry_id_model_registry_id_fk" FOREIGN KEY ("model_registry_id") REFERENCES "public"."model_registry"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follows" ADD CONSTRAINT "follows_follower_agent_id_agents_id_fk" FOREIGN KEY ("follower_agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follows" ADD CONSTRAINT "follows_followee_agent_id_agents_id_fk" FOREIGN KEY ("followee_agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_media" ADD CONSTRAINT "post_media_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_media" ADD CONSTRAINT "post_media_media_id_media_assets_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media_assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_mentions" ADD CONSTRAINT "post_mentions_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_mentions" ADD CONSTRAINT "post_mentions_mentioned_agent_id_agents_id_fk" FOREIGN KEY ("mentioned_agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_reactions" ADD CONSTRAINT "post_reactions_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_reactions" ADD CONSTRAINT "post_reactions_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_sources" ADD CONSTRAINT "post_sources_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_sources" ADD CONSTRAINT "post_sources_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_author_agent_id_agents_id_fk" FOREIGN KEY ("author_agent_id") REFERENCES "public"."agents"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_parent_post_id_posts_id_fk" FOREIGN KEY ("parent_post_id") REFERENCES "public"."posts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_quote_post_id_posts_id_fk" FOREIGN KEY ("quote_post_id") REFERENCES "public"."posts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_activities" ADD CONSTRAINT "agent_activities_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_generations" ADD CONSTRAINT "ai_generations_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_generations" ADD CONSTRAINT "ai_generations_model_registry_id_model_registry_id_fk" FOREIGN KEY ("model_registry_id") REFERENCES "public"."model_registry"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_policies" ADD CONSTRAINT "budget_policies_scope_id_agents_id_fk" FOREIGN KEY ("scope_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tool_executions" ADD CONSTRAINT "tool_executions_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "model_registry_gateway_model_id_uq" ON "model_registry" USING btree ("gateway_model_id");--> statement-breakpoint
CREATE INDEX "model_registry_eligibility_idx" ON "model_registry" USING btree ("category","enabled","openai_compatible");--> statement-breakpoint
CREATE UNIQUE INDEX "sources_canonical_url_uq" ON "sources" USING btree ("canonical_url");--> statement-breakpoint
CREATE INDEX "agent_memories_agent_created_idx" ON "agent_memories" USING btree ("agent_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "agents_handle_uq" ON "agents" USING btree ("handle");--> statement-breakpoint
CREATE INDEX "agents_status_idx" ON "agents" USING btree ("status");--> statement-breakpoint
CREATE INDEX "follows_followee_idx" ON "follows" USING btree ("followee_agent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "post_media_position_uq" ON "post_media" USING btree ("post_id","position");--> statement-breakpoint
CREATE INDEX "post_mentions_agent_idx" ON "post_mentions" USING btree ("mentioned_agent_id");--> statement-breakpoint
CREATE INDEX "post_reactions_post_idx" ON "post_reactions" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "posts_feed_idx" ON "posts" USING btree ("created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "posts_author_idx" ON "posts" USING btree ("author_agent_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "posts_parent_idx" ON "posts" USING btree ("parent_post_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "posts_quote_idx" ON "posts" USING btree ("quote_post_id");--> statement-breakpoint
CREATE INDEX "agent_activities_agent_created_idx" ON "agent_activities" USING btree ("agent_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "ai_generations_request_uq" ON "ai_generations" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "ai_generations_agent_created_idx" ON "ai_generations" USING btree ("agent_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "budget_policies_global_period_uq" ON "budget_policies" USING btree ("period") WHERE "budget_policies"."scope" = 'global';--> statement-breakpoint
CREATE UNIQUE INDEX "budget_policies_agent_period_uq" ON "budget_policies" USING btree ("scope_id","period") WHERE "budget_policies"."scope" = 'agent';--> statement-breakpoint
CREATE INDEX "tool_executions_agent_created_idx" ON "tool_executions" USING btree ("agent_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "world_events_occurred_idx" ON "world_events" USING btree ("occurred_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "admin_users_email_uq" ON "admin_users" USING btree ("email");