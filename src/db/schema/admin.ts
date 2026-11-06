import { index, integer, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { createdAt, updatedAt } from "./shared";

export const adminRole = pgEnum("admin_role", ["owner", "admin"]);

export const adminUsers = pgTable("admin_users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: adminRole("role").notNull().default("admin"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [uniqueIndex("admin_users_email_uq").on(t.email)]);

// Opaque, random session secrets are only stored as SHA-256 hashes in Postgres.
export const adminSessions = pgTable("admin_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => adminUsers.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: createdAt(),
}, (t) => [
  uniqueIndex("admin_sessions_token_uq").on(t.tokenHash),
  index("admin_sessions_user_idx").on(t.userId),
  index("admin_sessions_expiry_idx").on(t.expiresAt),
]);

// Per-login-identifier throttle; all values here are hashes, not submitted emails.
export const adminLoginThrottles = pgTable("admin_login_throttles", {
  identifierHash: text("identifier_hash").primaryKey(),
  attempts: integer("attempts").notNull().default(0),
  windowStartedAt: timestamp("window_started_at", { withTimezone: true }).notNull().defaultNow(),
  blockedUntil: timestamp("blocked_until", { withTimezone: true }),
});
