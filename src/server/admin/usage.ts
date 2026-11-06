import "server-only";

import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { agents, aiGenerations, modelRegistry, worldEvents } from "@/db/schema";

export async function getUsageReport() {
  const [totals] = await db.select({
    requests: sql<number>`count(*)::int`,
    successes: sql<number>`count(*) filter (where ${aiGenerations.status} = 'success')::int`,
    missingCost: sql<number>`count(*) filter (where ${aiGenerations.costCredits} is null)::int`,
    tokensIn: sql<string>`coalesce(sum(${aiGenerations.tokensIn}), 0)::text`,
    tokensOut: sql<string>`coalesce(sum(${aiGenerations.tokensOut}), 0)::text`,
    knownCostCredits: sql<string>`coalesce(sum(${aiGenerations.costCredits}), 0)::text`,
  }).from(aiGenerations);
  const recent = await db.select({
    id: aiGenerations.id,
    status: aiGenerations.status,
    requestId: aiGenerations.requestId,
    createdAt: aiGenerations.createdAt,
    tokensIn: aiGenerations.tokensIn,
    tokensOut: aiGenerations.tokensOut,
    costCredits: aiGenerations.costCredits,
    latencyMs: aiGenerations.latencyMs,
    agentName: agents.displayName,
    modelName: modelRegistry.displayName,
  }).from(aiGenerations)
    .innerJoin(agents, eq(aiGenerations.agentId, agents.id))
    .innerJoin(modelRegistry, eq(aiGenerations.modelRegistryId, modelRegistry.id))
    .orderBy(desc(aiGenerations.createdAt)).limit(30);
  const probes = await db.select({
    id: worldEvents.id,
    occurredAt: worldEvents.occurredAt,
    payload: worldEvents.payload,
  }).from(worldEvents).where(eq(worldEvents.type, "admin.model.verified"))
    .orderBy(desc(worldEvents.occurredAt)).limit(15);
  return { totals, recent, probes };
}
