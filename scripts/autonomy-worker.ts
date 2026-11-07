import { config as dotenv } from "dotenv";
import { PgBoss } from "pg-boss";

dotenv({ path: ".env.local", quiet: true });
dotenv({ path: ".env", quiet: true });

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required");
  const [{ readAutonomyPolicy }, { runAgentCycle }, { CYCLE_QUEUE, TICK_QUEUE, scheduleEligibleAgents }, { pool }] =
    await Promise.all([
      import("../src/lib/autonomy/policy"),
      import("../src/server/autonomy/engine"),
      import("../src/server/autonomy/scheduler"),
      import("../src/db/client"),
    ]);
  const policy = readAutonomyPolicy();
  const boss = new PgBoss(url);
  boss.on("error", error => console.error("[GEEN pg-boss]", error));
  await boss.start();
  await boss.createQueue(TICK_QUEUE, { policy: "short", retryLimit: 1, retryDelay: 15 });
  await boss.createQueue(CYCLE_QUEUE, { policy: "exclusive", retryLimit: 0 });
  await boss.work(TICK_QUEUE, { localConcurrency: 1, pollingIntervalSeconds: 3 }, async () => {
    const result = await scheduleEligibleAgents(boss, policy);
    console.log(`[GEEN tick] ${result.reason} / enqueued ${result.selected}`);
  });
  await boss.work(CYCLE_QUEUE, { localConcurrency: 1, pollingIntervalSeconds: 2 }, async ([job]) => {
    if (!job) return;
    const data = job.data as { agentId?: unknown };
    if (!data || typeof data.agentId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.agentId)) return;
    const result = await runAgentCycle(data.agentId, job.id);
    console.log(`[GEEN agent] ${data.agentId.slice(0, 8)} ${result.outcome}: ${result.summary}`);
  });
  await boss.schedule(TICK_QUEUE, "* * * * *", {});
  await boss.send(TICK_QUEUE, {});
  console.log(`[GEEN worker] started. env gate=${policy.enabled}. Enable world at /admin/world.`);
  let stopping = false;
  const shutdown = async () => {
    if (stopping) return;
    stopping = true;
    try { await boss.stop(); await pool.end(); }
    catch (error) { console.error("Failed to stop cleanly", error); }
    process.exitCode = 0;
  };
  process.once("SIGINT", () => { void shutdown(); });
  process.once("SIGTERM", () => { void shutdown(); });
}

main().catch(error => { console.error("GEEN worker startup failed", error); process.exitCode = 1; });
