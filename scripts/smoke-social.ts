import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import { and, eq } from "drizzle-orm";
import { agents, follows, modelRegistry, postReactions, posts } from "../src/db/schema";

config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });

async function main() {
  const { db, pool } = await import("../src/db/client");
  const rollback = new Error("GEEN_SMOKE_ROLLBACK");
  const name = `geen-smoke-${randomUUID()}`;
  try {
    try {
      await db.transaction(async (tx) => {
        const [model] = await tx.insert(modelRegistry).values({
          gatewayModelId: name,
          displayName: "Smoke fixture — never sent to gateway",
          family: "test",
          enabled: false,
        }).returning();
        const suffix = randomUUID().replaceAll("-", "").slice(0, 10);
        const [a] = await tx.insert(agents).values({
          handle: `smoke_a_${suffix}`,
          displayName: "Test Agent A",
          modelRegistryId: model.id,
        }).returning();
        const [b] = await tx.insert(agents).values({
          handle: `smoke_b_${suffix}`,
          displayName: "Test Agent B",
          modelRegistryId: model.id,
        }).returning();
        if (a.status !== "active" || b.status !== "active") throw new Error("New agents must default to active");

        const [original] = await tx.insert(posts).values({ authorAgentId: a.id, kind: "post", body: "Smoke test post" }).returning();
        const [reply] = await tx.insert(posts).values({ authorAgentId: b.id, kind: "reply", parentPostId: original.id, body: "Smoke test reply" }).returning();
        await tx.insert(postReactions).values({ agentId: a.id, postId: reply.id }).onConflictDoNothing();
        await tx.insert(postReactions).values({ agentId: a.id, postId: reply.id }).onConflictDoNothing();
        await tx.insert(follows).values({ followerAgentId: a.id, followeeAgentId: b.id }).onConflictDoNothing();
        await tx.insert(follows).values({ followerAgentId: a.id, followeeAgentId: b.id }).onConflictDoNothing();

        const reactions = await tx.select().from(postReactions).where(and(eq(postReactions.agentId, a.id), eq(postReactions.postId, reply.id)));
        const edges = await tx.select().from(follows).where(eq(follows.followerAgentId, a.id));
        if (reactions.length !== 1 || edges.length !== 1) throw new Error("Social deduplication failed");
        console.log("PASS: default active, root/reply, idempotent likes and follows");
        throw rollback; // Always leave the database unchanged.
      });
      throw new Error("Transaction should have been rolled back");
    } catch (error) {
      if (error !== rollback) throw error;
    }
    const [leftover] = await db.select({ id: modelRegistry.id }).from(modelRegistry).where(eq(modelRegistry.gatewayModelId, name));
    if (leftover) throw new Error("Smoke fixtures were not rolled back");
    console.log("PASS: rollback verified — no fixture data remains");
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => { console.error("Smoke test failed:", error); process.exitCode = 1; });
