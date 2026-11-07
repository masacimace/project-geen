import { eq } from "drizzle-orm";
import { createHash } from "node:crypto";
import { db, pool } from "@/db/client";
import { agentActivities, agentStates, autonomySettings, worldEvents } from "@/db/schema";
import { buildAgentMessages } from "@/lib/autonomy/prompts";
import { InvalidAgentIntent, parseAgentIntent, type AgentIntent } from "@/lib/autonomy/intents";
import { readAutonomyPolicy } from "@/lib/autonomy/policy";
import { completeAgentText } from "@/server/ai/agent-completion";
import { YupiAIError } from "@/server/ai/yupiai-client";
import { executeAgentIntent } from "./actions";
import { getWorldContext } from "./context";
import { guardAgentCall } from "./guards";

export async function runAgentCycle(agentId: string, correlationId: string) {
  // Cross-process protection for manual CLI + scheduled worker on the same agent.
  // The session-level advisory lock is pinned to one PG connection until inference completes.
  const hash = createHash("sha256").update(`geen:agent:${agentId}`).digest("hex").slice(0, 16);
  const key = BigInt.asIntN(64, BigInt(`0x${hash}`)).toString();
  const conn = await pool.connect();
  let acquired = false;
  try {
    const result = await conn.query<{ locked: boolean }>("select pg_try_advisory_lock($1::bigint) as locked", [key]);
    acquired = result.rows[0]?.locked === true;
    if (!acquired) return { outcome: "skipped", summary: "agent_cycle_already_running" };
    return await runLockedAgentCycle(agentId, correlationId);
  } finally {
    if (acquired) {
      try { await conn.query("select pg_advisory_unlock($1::bigint)", [key]); }
      catch (error) { console.error("[GEEN] failed to release agent lock", error); }
    }
    conn.release();
  }
}

async function runLockedAgentCycle(agentId: string, correlationId: string) {
  const policy = readAutonomyPolicy();
  const guard = await guardAgentCall(agentId, policy);
  if (!guard.ok) return { outcome: "skipped", summary: guard.reason };
  // pg-boss has retryLimit:0 for paid jobs. A claimed job is not automatically re-billed.
  const [existing] = await db.select({ outcome: agentActivities.outcome }).from(agentActivities)
    .where(eq(agentActivities.correlationId, correlationId)).limit(1);
  if (existing) return { outcome: "skipped", summary: "duplicate_cycle_id" };

  const [activity] = await db.insert(agentActivities).values({
    agentId, intentType: "deliberate", outcome: "started", correlationId,
  }).returning({ id: agentActivities.id });
  try {
    const context = await getWorldContext(agentId);
    if (!context) throw new Error("Agent context not found");
    const completion = await completeAgentText({
      agentId, messages: buildAgentMessages(context), maxTokens: policy.maxOutputTokens,
    });
    let intent: AgentIntent;
    try { intent = parseAgentIntent(completion.text); }
    catch (error) {
      if (!(error instanceof InvalidAgentIntent)) throw error;
      await db.update(agentActivities).set({ intentType: "invalid", outcome: "skipped", summary: "invalid_json_decision" })
        .where(eq(agentActivities.id, activity.id));
      await db.update(agentStates).set({ lastActiveAt: new Date() }).where(eq(agentStates.agentId, agentId));
      return { outcome: "skipped", summary: "invalid_json_decision" };
    }
    return await executeAgentIntent({ agentId, activityId: activity.id, intent, context, policy });
  } catch (error) {
    const status = error instanceof YupiAIError && error.status ? `yupiai_http_${error.status}` : "cycle_failed";
    await db.update(agentActivities).set({ outcome: "failed", summary: status }).where(eq(agentActivities.id, activity.id));
    await db.update(agentStates).set({ lastActiveAt: new Date() }).where(eq(agentStates.agentId, agentId));
    if (error instanceof YupiAIError && (error.status === 402 || error.status === 403)) {
      // Stop new calls for the world until the operator inspects account access/credits.
      await db.update(autonomySettings).set({ enabled: false, updatedAt: new Date() })
        .where(eq(autonomySettings.id, "world"));
      await db.insert(worldEvents).values({ type: "autonomy.gateway_stopped", payload: { status: error.status, agentId } });
    }
    console.error(`[GEEN] agent cycle ${correlationId} failed (${status})`);
    return { outcome: "failed", summary: status };
  }
}
