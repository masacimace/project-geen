import { boolean, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

// The public agents' status is independent from the world-wide operator switch.
// Default OFF prevents migrations/restarts from creating unexpected paid calls.
export const autonomySettings = pgTable("autonomy_settings", {
  id: varchar("id", { length: 16 }).primaryKey().default("world"),
  enabled: boolean("enabled").notNull().default(false),
  updatedBy: text("updated_by"),
  workerHeartbeatAt: timestamp("worker_heartbeat_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
