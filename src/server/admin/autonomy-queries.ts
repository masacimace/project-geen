import "server-only";
import { desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { agents, agentActivities, aiGenerations, autonomySettings } from "@/db/schema";

export async function getAutonomyDashboard() {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const [[control], [usage], recent] = await Promise.all([
    db.select().from(autonomySettings).where(eq(autonomySettings.id, "world")).limit(1),
    db.select({ calls: sql<number>`count(*)::int`, credits: sql<string>`coalesce(sum(${aiGenerations.costCredits}),0)::text` })
      .from(aiGenerations).where(gte(aiGenerations.createdAt, today)),
    db.select({ id: agentActivities.id, handle: agents.handle, displayName: agents.displayName,
      intent: agentActivities.intentType, outcome: agentActivities.outcome, summary: agentActivities.summary,
      createdAt: agentActivities.createdAt })
      .from(agentActivities).innerJoin(agents, eq(agentActivities.agentId, agents.id))
      .orderBy(desc(agentActivities.createdAt)).limit(30),
  ]);
  const workerLastTick = control?.workerHeartbeatAt ?? null;
  const heartbeatAge = workerLastTick ? now.getTime() - workerLastTick.getTime() : Infinity;
  const workerOnline = heartbeatAge >= 0 && heartbeatAge < 150_000;
  return { enabled: control?.enabled ?? false, envEnabled: process.env.GEEN_AUTONOMY_ENABLED === "true",
    workerLastTick, workerOnline,
    callsToday: usage?.calls ?? 0, creditsToday: usage?.credits ?? "0", recent };
}
