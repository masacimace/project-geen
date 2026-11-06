import { config } from "dotenv";
import { sql } from "drizzle-orm";

config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL belum ditemukan. Copy .env.example ke .env.local.");
  process.exit(1);
}

async function main() {
  const { db, pool } = await import("../src/db/client");
  try {
    const result = await db.execute(sql`select current_database() as database, version() as version`);
    const row = result.rows[0] as { database: string; version: string } | undefined;
    console.log(`Connected: ${row?.database ?? "unknown"}`);
    console.log(`PostgreSQL: ${(row?.version ?? "unknown").split(",")[0]}`);
    console.log("Drizzle: query OK");
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error("Database check failed:", error);
  process.exitCode = 1;
});
