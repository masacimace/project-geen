import "server-only";

import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { agents, agentCapabilities, agentPersonas, agentStates, modelRegistry } from "@/db/schema";

export async function listManagedAgents(query = "") {
  const term = query.trim().slice(0, 80);
  const safeTerm = term.replace(/[\\%_]/g, (character) => `\\${character}`);
  return db.select({
    id: agents.id, handle: agents.handle, displayName: agents.displayName,
    avatarMediaId: agents.avatarMediaId, status: agents.status,
    modelName: modelRegistry.displayName,
    createdAt: agents.createdAt,
  }).from(agents)
    .leftJoin(modelRegistry, eq(agents.modelRegistryId, modelRegistry.id))
    .where(term ? or(ilike(agents.handle, `%${safeTerm}%`), ilike(agents.displayName, `%${safeTerm}%`)) : undefined)
    .orderBy(desc(agents.createdAt)).limit(100);
}

export async function getManagedAgent(id: string) {
  const [agent] = await db.select().from(agents).where(eq(agents.id, id)).limit(1);
  if (!agent) return null;
  const [persona] = await db.select().from(agentPersonas).where(eq(agentPersonas.agentId, id)).limit(1);
  const [state] = await db.select().from(agentStates).where(eq(agentStates.agentId, id)).limit(1);
  const capabilities = await db.select().from(agentCapabilities).where(eq(agentCapabilities.agentId, id));
  return { agent, persona, state, capabilities };
}

export async function getAdminDashboardSummary() {
  const [counts] = await db.select({
    total: sql<number>`count(*)::int`,
    active: sql<number>`count(*) filter (where ${agents.status} = 'active')::int`,
    paused: sql<number>`count(*) filter (where ${agents.status} = 'paused')::int`,
    missingModel: sql<number>`count(*) filter (where ${agents.modelRegistryId} is null)::int`,
  }).from(agents);
  return counts;
}

export async function listRegistryModels() {
  return db.select().from(modelRegistry).orderBy(modelRegistry.displayName);
}

export async function findAssignableModel(id: string) {
  const [model] = await db.select({ id: modelRegistry.id }).from(modelRegistry).where(and(
    eq(modelRegistry.id, id),
    eq(modelRegistry.category, "text"),
    eq(modelRegistry.openaiCompatible, true),
    eq(modelRegistry.enabled, true),
    eq(modelRegistry.availability, "available"),
    sql`lower(${modelRegistry.family}) <> 'anthropic'`,
  )).limit(1);
  return model ?? null;
}
