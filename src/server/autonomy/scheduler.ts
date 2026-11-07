import type { PgBoss } from "pg-boss";
import { and, eq, gte, ne } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db/client";
import { agents, agentStates, autonomySettings, modelRegistry, postMentions, posts } from "@/db/schema";
import { isAnthropicModel } from "@/server/ai/model-catalog";
import { eligibleForTick, type AutonomyPolicy } from "@/lib/autonomy/policy";
import { worldEnabled } from "./guards";

export const TICK_QUEUE = "geen-autonomy-tick";
export const CYCLE_QUEUE = "geen-agent-cycle";

export async function scheduleEligibleAgents(boss: PgBoss, policy: AutonomyPolicy) {
  const heartbeat = new Date();
  await db.insert(autonomySettings).values({ id: "world", enabled: false, workerHeartbeatAt: heartbeat })
    .onConflictDoUpdate({ target: autonomySettings.id, set: { workerHeartbeatAt: heartbeat } });
  if (!(await worldEnabled(policy))) return { selected: 0, reason: "world_paused" };
  const now = new Date();
  const candidates = await db.select({
    id: agents.id, model: modelRegistry, lastActiveAt: agentStates.lastActiveAt,
  }).from(agents)
    .innerJoin(modelRegistry, eq(agents.modelRegistryId, modelRegistry.id))
    .leftJoin(agentStates, eq(agentStates.agentId, agents.id))
    .where(and(eq(agents.status, "active"), eq(modelRegistry.enabled, true),
      eq(modelRegistry.openaiCompatible, true), eq(modelRegistry.availability, "available"),
      eq(modelRegistry.category, "text")))
    .limit(500);
  // Fresh replies/mentions are stimuli, not automatic reply commands.
  const parent = alias(posts, "stimulus_parent");
  const since = new Date(now.getTime() - 60 * 60_000);
  const [replies, mentions] = await Promise.all([
    db.select({ agentId: parent.authorAgentId, createdAt: posts.createdAt })
      .from(posts).innerJoin(parent, eq(posts.parentPostId, parent.id))
      .where(and(eq(posts.kind, "reply"), gte(posts.createdAt, since), ne(posts.authorAgentId, parent.authorAgentId))).limit(200),
    db.select({ agentId: postMentions.mentionedAgentId, createdAt: posts.createdAt })
      .from(postMentions).innerJoin(posts, eq(postMentions.postId, posts.id))
      .where(gte(posts.createdAt, since)).limit(200),
  ]);
  const stimuli = [...replies, ...mentions];
  const shuffled = [...candidates];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  let selected = 0;
  for (const candidate of shuffled) {
    if (selected >= policy.maxPerTick) break;
    if (isAnthropicModel({ gatewayModelId: candidate.model.gatewayModelId,
      displayName: candidate.model.displayName, family: candidate.model.family })) continue;
    const stimulated = stimuli.some(row => row.agentId === candidate.id &&
      (!candidate.lastActiveAt || row.createdAt > candidate.lastActiveAt));
    const localPolicy = stimulated ? {
      ...policy, minGapMinutes: Math.max(1, policy.minGapMinutes / 3),
      tickProbability: Math.min(0.9, policy.tickProbability + 0.35),
    } : policy;
    if (!eligibleForTick(candidate.lastActiveAt, now, localPolicy, Math.random())) continue;
    const jobId = await boss.send(CYCLE_QUEUE, { agentId: candidate.id }, {
      singletonKey: candidate.id,
      singletonSeconds: 60,
      retryLimit: 0, expireInSeconds: 180,
    });
    if (jobId) selected++;
  }
  return { selected, reason: "scheduled" };
}
