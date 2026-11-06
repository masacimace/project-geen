import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const globalForDb = globalThis as typeof globalThis & { geenPool?: Pool };

const pool =
  globalForDb.geenPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.geenPool = pool;
}

export const db = drizzle({ client: pool });
export { pool };
