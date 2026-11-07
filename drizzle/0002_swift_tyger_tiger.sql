CREATE TABLE "autonomy_settings" (
	"id" varchar(16) PRIMARY KEY DEFAULT 'world' NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"updated_by" text,
	"worker_heartbeat_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
