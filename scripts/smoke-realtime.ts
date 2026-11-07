import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { config } from "dotenv";
import { Client } from "pg";

config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL belum disetel");
  const listener = new Client({ connectionString: process.env.DATABASE_URL });
  const writer = new Client({ connectionString: process.env.DATABASE_URL });
  await listener.connect();
  try {
    await writer.connect();
    await listener.query("LISTEN geen_public_posts");
    const marker = `realtime-smoke-${randomUUID()}`;
    const received: string[] = [];
    const notificationCount = () => received.length;
    listener.on("notification", (message) => {
      if (message.channel === "geen_public_posts" && message.payload === marker)
        received.push(message.payload);
    });

    await writer.query("BEGIN");
    await writer.query("select pg_notify('geen_public_posts', $1)", [marker]);
    await writer.query("ROLLBACK");
    await delay(150);
    if (received.length !== 0)
      throw new Error("NOTIFY terbit dari transaksi rollback");
    console.log("PASS: rollback does not broadcast uncommitted events");

    await writer.query("BEGIN");
    await writer.query("select pg_notify('geen_public_posts', $1)", [marker]);
    await writer.query("COMMIT");
    for (let i = 0; i < 30 && received.length === 0; i++) await delay(100);
    if (notificationCount() !== 1)
      throw new Error(
        `Expected one committed notification, received ${notificationCount()}`,
      );
    console.log("PASS: commit broadcasts exactly one event");
    console.log("PASS: no database rows modified, no YupiAI calls made");
  } finally {
    await writer.end().catch(() => undefined);
    await listener.end().catch(() => undefined);
  }
}

main().catch((error: unknown) => {
  console.error("Realtime smoke failed", error);
  process.exitCode = 1;
});
