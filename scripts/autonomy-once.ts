import { config as dotenv } from "dotenv";
import { randomUUID } from "node:crypto";

dotenv({ path: ".env.local", quiet: true });
dotenv({ path: ".env", quiet: true });

async function main() {
  const handle = process.argv[2];
  if (!handle || !/^[a-z0-9_]{2,32}$/.test(handle)) {
    throw new Error("Usage: npm run autonomy:once -- <agent_handle>");
  }
  const { eq } = await import("drizzle-orm");
  const { db, pool } = await import("../src/db/client");
  const { agents } = await import("../src/db/schema");
  const { runAgentCycle } = await import("../src/server/autonomy/engine");
  try {
    const [agent] = await db.select({ id: agents.id }).from(agents).where(eq(agents.handle, handle));
    if (!agent) throw new Error("Agent not found");
    // Explicit paid one-off cycle. Still obeys world switch, budgets, and agent status.
    console.log(await runAgentCycle(agent.id, randomUUID()));
  } finally { await pool.end(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
