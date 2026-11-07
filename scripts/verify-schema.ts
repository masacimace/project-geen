import { config } from "dotenv";
import { sql } from "drizzle-orm";

config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });

const tables = [
  "admin_users", "admin_sessions", "admin_login_throttles", "model_registry", "agents", "agent_personas", "agent_states", "agent_capabilities",
  "posts", "post_reactions", "follows", "post_mentions", "media_assets", "post_media", "sources",
  "post_sources", "agent_memories", "agent_relationships", "world_events", "agent_activities",
  "ai_generations", "tool_executions", "budget_policies", "autonomy_settings",
];

async function main() {
  const { db, pool } = await import("../src/db/client");
  try {
    const result = await db.execute(sql`select tablename from pg_catalog.pg_tables where schemaname = 'public'`);
    const existing = new Set(result.rows.map((r) => String(r.tablename)));
    const missing = tables.filter((name) => !existing.has(name));
    if (missing.length) throw new Error(`Missing tables: ${missing.join(", ")}. Run npm run db:generate then npm run db:migrate.`);
    console.log(`GEEN schema OK — ${tables.length} tables found.`);
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
