import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { adminSessions, adminUsers, agents, agentCapabilities, agentPersonas, agentStates, worldEvents } from "../src/db/schema";
import { hashAdminPassword, verifyAdminPassword } from "../src/lib/admin/password";

config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });

async function main() {
  const { db, pool } = await import("../src/db/client");
  const testEmail = `smoke_${randomUUID()}@geen.test`;
  const agentHandle = `smoke_${randomUUID().replaceAll("-", "").slice(0, 12)}`;
  const rollback = new Error("GEEN_ADMIN_SMOKE_ROLLBACK");
  try {
    const hash = await hashAdminPassword("This is an intentionally strong test password 123!");
    if (!(await verifyAdminPassword("This is an intentionally strong test password 123!", hash))) throw new Error("Password verification failed");
    if (await verifyAdminPassword("wrong password", hash)) throw new Error("Wrong password accepted");
    console.log("PASS: scrypt password hashing and verification");
    try {
      await db.transaction(async (tx) => {
        const [owner] = await tx.insert(adminUsers).values({ email: testEmail, passwordHash: hash, role: "owner" }).returning();
        await tx.insert(adminSessions).values({ userId: owner.id, tokenHash: randomUUID(), expiresAt: new Date(Date.now() + 60_000) });
        const [agent] = await tx.insert(agents).values({ handle: agentHandle, displayName: "Admin smoke fixture" }).returning();
        if (agent.status !== "active" || agent.modelRegistryId !== null) throw new Error("Agent default must be active without a model");
        await tx.insert(agentPersonas).values({ agentId: agent.id, seedPrompt: "Curious", traits: { notes: "Sample" } });
        await tx.insert(agentStates).values({ agentId: agent.id, interests: ["research"] });
        await tx.insert(agentCapabilities).values({ agentId: agent.id, key: "post", enabled: true });
        await tx.insert(worldEvents).values({ type: "admin.agent.created", payload: { agentId: agent.id, actorId: owner.id } });
        const [paused] = await tx.update(agents).set({ status: "paused" }).where(eq(agents.id, agent.id)).returning();
        if (paused.status !== "paused") throw new Error("Pause failed");
        const [active] = await tx.update(agents).set({ status: "active" }).where(eq(agents.id, agent.id)).returning();
        if (active.status !== "active") throw new Error("Resume failed");
        console.log("PASS: admin session, agent/persona/state/capability create, pause/resume");
        throw rollback;
      });
      throw new Error("Smoke transaction was not rolled back");
    } catch (error) {
      if (error !== rollback) throw error;
    }
    const [leftover] = await db.select({ id: adminUsers.id }).from(adminUsers).where(eq(adminUsers.email, testEmail));
    if (leftover) throw new Error("Smoke fixture left in DB");
    console.log("PASS: transaction rollback, no fixture data remains");
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => { console.error("Admin smoke test failed:", error); process.exitCode = 1; });
