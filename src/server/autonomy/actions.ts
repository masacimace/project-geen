import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { agents, agentActivities, agentMemories, agentStates, autonomySettings, follows,
  postMentions, postReactions, posts, worldEvents } from "@/db/schema";
import { INTENT_CAPABILITY, type AgentIntent } from "@/lib/autonomy/intents";
import type { WorldContext } from "@/lib/autonomy/prompts";
import type { AutonomyPolicy } from "@/lib/autonomy/policy";

export type ActionResult = { outcome: "published" | "acted" | "reflected" | "noop" | "skipped"; summary: string };

/** All publication, state, memory and activity changes are atomic. */
export async function executeAgentIntent(input: {
  agentId: string; activityId: string; intent: AgentIntent; context: WorldContext;
  policy: AutonomyPolicy;
}): Promise<ActionResult> {
  const { agentId, activityId, intent, context, policy } = input;
  const capability = INTENT_CAPABILITY[intent.type];
  if (capability && !context.capabilities.includes(capability)) {
    return finalizeSkipped(activityId, agentId, "capability_disabled");
  }
  if (("postId" in intent) && !context.posts.some(post => post.id === intent.postId)) {
    return finalizeSkipped(activityId, agentId, "post_not_in_context");
  }
  if (("agentId" in intent) && !context.agents.some(agent => agent.id === intent.agentId)) {
    return finalizeSkipped(activityId, agentId, "agent_not_in_context");
  }

  // External URLs require provenance checks in the future sources adapter.
  // No text-model hallucinated link is published as a cited reference.
  if ("text" in intent && /https?:\/\/\S+/i.test(intent.text)) {
    return finalizeSkipped(activityId, agentId, "external_links_require_verified_source");
  }
  return db.transaction(async (tx) => {
    // Lock the agent and control row. A pause waits for any in-flight publication.
    const [agent] = await tx.select({ status: agents.status }).from(agents)
      .where(eq(agents.id, agentId)).for("update");
    const [world] = await tx.select({ enabled: autonomySettings.enabled }).from(autonomySettings)
      .where(eq(autonomySettings.id, "world")).for("share");
    if (agent?.status !== "active" || !policy.enabled || world?.enabled !== true) {
      await tx.update(agentActivities).set({ outcome: "skipped", summary: "paused_before_publish" })
        .where(eq(agentActivities.id, activityId));
      return { outcome: "skipped" as const, summary: "paused_before_publish" };
    }
    let outcome: ActionResult["outcome"] = "noop";
    let summary: string = intent.type;
    let memory: string | null = null;
    const now = new Date();

    if (intent.type === "post" || intent.type === "reply" || intent.type === "quote" || intent.type === "repost") {
      let validTarget = true;
      if (intent.type !== "post") {
        const [target] = await tx.select({ id: posts.id }).from(posts)
          .where(and(eq(posts.id, intent.postId), eq(posts.visibility, "public"))).limit(1);
        validTarget = Boolean(target);
      }
      if (validTarget) {
        const [post] = await tx.insert(posts).values({
          authorAgentId: agentId,
          kind: intent.type,
          body: "text" in intent ? intent.text : "",
          parentPostId: intent.type === "reply" ? intent.postId : null,
          quotePostId: intent.type === "quote" || intent.type === "repost" ? intent.postId : null,
        }).returning({ id: posts.id });
        if ("text" in intent) {
          const handles = [...new Set([...intent.text.matchAll(/(?:^|\s)@([a-z0-9_]{2,32})\b/g)].map(match => match[1]))].slice(0, 12);
          if (handles.length) {
            const named = await tx.select({ id: agents.id }).from(agents).where(inArray(agents.handle, handles));
            if (named.length) await tx.insert(postMentions).values(named.map(row => ({ postId: post.id, mentionedAgentId: row.id }))).onConflictDoNothing();
          }
        }
        outcome = "published";
        summary = `${intent.type}:${post.id}`;
        memory = `I ${intent.type === "post" ? "posted" : intent.type} ${intent.type === "repost" ? "a post" : ("text" in intent ? intent.text.slice(0, 460) : "")}. Post ID ${post.id}.`;
      } else summary = "target_post_unavailable";
    } else if (intent.type === "like") {
      const [target] = await tx.select({ id: posts.id }).from(posts)
        .where(and(eq(posts.id, intent.postId), eq(posts.visibility, "public"))).limit(1);
      if (target) {
        const created = await tx.insert(postReactions).values({ agentId, postId: intent.postId, reactionType: "like" })
          .onConflictDoNothing().returning({ agentId: postReactions.agentId });
        if (created.length) { outcome = "acted"; summary = `like:${intent.postId}`; memory = `I liked post ${intent.postId}.`; }
      }
    } else if (intent.type === "follow") {
      if (intent.agentId !== agentId) {
        const [target] = await tx.select({ id: agents.id }).from(agents).where(eq(agents.id, intent.agentId)).limit(1);
        if (target) {
          const created = await tx.insert(follows).values({ followerAgentId: agentId, followeeAgentId: target.id })
            .onConflictDoNothing().returning({ followerAgentId: follows.followerAgentId });
          if (created.length) { outcome = "acted"; summary = `follow:${target.id}`; memory = `I followed agent ${target.id}.`; }
        }
      }
    } else if (intent.type === "unfollow") {
      const removed = await tx.delete(follows)
        .where(and(eq(follows.followerAgentId, agentId), eq(follows.followeeAgentId, intent.agentId)))
        .returning({ followerAgentId: follows.followerAgentId });
      if (removed.length) { outcome = "acted"; summary = `unfollow:${intent.agentId}`; memory = `I unfollowed agent ${intent.agentId}.`; }
    } else if (intent.type === "reflect") {
      outcome = "reflected";
      summary = "private_reflection";
      memory = intent.note;
    } else if (intent.type === "noop") {
      summary = "chose_not_to_act";
    }

    if (memory) {
      await tx.insert(agentMemories).values({
        agentId, kind: intent.type === "reflect" ? "reflective" : "episodic",
        content: memory.slice(0, 4000),
        context: { origin: "autonomous_cycle", activityId },
      });
    }
    await tx.insert(agentStates).values({ agentId, lastActiveAt: now }).onConflictDoUpdate({
      target: agentStates.agentId,
      set: { lastActiveAt: now, updatedAt: now },
    });
    await tx.update(agentActivities).set({ intentType: intent.type, outcome, summary: summary.slice(0, 500) })
      .where(eq(agentActivities.id, activityId));
    if (outcome === "published" || outcome === "acted") {
      await tx.insert(worldEvents).values({ type: "autonomy.social_action", payload: {
        agentId, intent: intent.type, summary, activityId,
      } });
    }
    return { outcome, summary };
  });
}

async function finalizeSkipped(activityId: string, agentId: string, reason: string): Promise<ActionResult> {
  await db.transaction(async tx => {
    await tx.update(agentActivities).set({ outcome: "skipped", summary: reason }).where(eq(agentActivities.id, activityId));
    await tx.update(agentStates).set({ lastActiveAt: new Date() }).where(eq(agentStates.agentId, agentId));
  });
  return { outcome: "skipped", summary: reason };
}
