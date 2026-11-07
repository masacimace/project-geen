import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { agents, aiGenerations, autonomySettings, budgetPolicies, modelRegistry } from "@/db/schema";
import { isAnthropicModel } from "@/server/ai/model-catalog";
import { type AutonomyPolicy } from "@/lib/autonomy/policy";

export type GuardResult = { ok: true } | { ok: false; reason: string };

export async function worldEnabled(policy: AutonomyPolicy): Promise<boolean> {
  if (!policy.enabled) return false;
  const [row] = await db.select({ enabled: autonomySettings.enabled })
    .from(autonomySettings).where(eq(autonomySettings.id, "world")).limit(1);
  return row?.enabled === true;
}

function periodBeginning(period: "day" | "week" | "month" | "lifetime", now: Date): Date | null {
  if (period === "lifetime") return null;
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (period === "week") start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
  if (period === "month") start.setUTCDate(1);
  return start;
}

async function usageSince(start: Date | null, agentId?: string) {
  const where = and(start ? gte(aiGenerations.createdAt, start) : undefined,
    agentId ? eq(aiGenerations.agentId, agentId) : undefined);
  const [usage] = await db.select({
    calls: sql<number>`count(*)::int`,
    credits: sql<string>`coalesce(sum(${aiGenerations.costCredits}), 0)::text`,
  }).from(aiGenerations).where(where);
  return { calls: usage?.calls ?? 0, credits: Number(usage?.credits ?? "0") };
}

/** Check as close as practical to every paid call (single worker concurrency by default). */
export async function guardAgentCall(agentId: string, policy: AutonomyPolicy): Promise<GuardResult> {
  if (!(await worldEnabled(policy))) return { ok: false, reason: "world_paused" };
  const [record] = await db.select({ agent: agents, model: modelRegistry })
    .from(agents).leftJoin(modelRegistry, eq(agents.modelRegistryId, modelRegistry.id))
    .where(eq(agents.id, agentId)).limit(1);
  if (!record || record.agent.status !== "active") return { ok: false, reason: "agent_inactive" };
  const model = record.model;
  if (!model || !model.enabled || !model.openaiCompatible || model.category !== "text" || model.availability !== "available" ||
    isAnthropicModel({ gatewayModelId: model.gatewayModelId, displayName: model.displayName, family: model.family })) {
    return { ok: false, reason: "model_not_eligible" };
  }
  const now = new Date();
  const dailyStart = periodBeginning("day", now);
  const [global, perAgent] = await Promise.all([
    usageSince(dailyStart), usageSince(dailyStart, agentId),
  ]);
  if (global.calls >= policy.maxDailyCalls) return { ok: false, reason: "global_daily_call_limit" };
  if (perAgent.calls >= policy.maxAgentDailyCalls) return { ok: false, reason: "agent_daily_call_limit" };
  if (global.credits >= policy.maxDailyCredits) return { ok: false, reason: "global_daily_credit_limit" };

  const configured = await db.select().from(budgetPolicies).where(eq(budgetPolicies.mode, "stop"));
  for (const rule of configured) {
    if (rule.scope === "agent" && rule.scopeId !== agentId) continue;
    const u = await usageSince(periodBeginning(rule.period, now), rule.scope === "agent" ? agentId : undefined);
    if (u.credits >= Number(rule.creditLimit)) return { ok: false, reason: `budget_policy_${rule.scope}_${rule.period}` };
  }
  return { ok: true };
}

/** Pausing the world is a live safety control, even while a request is in flight. */
export async function canPublish(agentId: string, policy: AutonomyPolicy) {
  if (!(await worldEnabled(policy))) return false;
  const [row] = await db.select({ status: agents.status }).from(agents).where(eq(agents.id, agentId));
  return row?.status === "active";
}
