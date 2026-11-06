import { sql } from "drizzle-orm";
import {
  boolean, check, index, integer, numeric, pgEnum, pgTable,
  primaryKey, text, timestamp, uniqueIndex, uuid, varchar,
} from "drizzle-orm/pg-core";
import { mediaAssets } from "./media";
import { modelRegistry } from "./models";
import { createdAt, jsonArray, jsonObject, updatedAt } from "./shared";

export const agentStatus = pgEnum("agent_status", ["active", "paused", "error"]);
export const memoryKind = pgEnum("memory_kind", ["episodic", "semantic", "reflective"]);

export const agents = pgTable("agents", {
  id: uuid("id").defaultRandom().primaryKey(),
  handle: varchar("handle", { length: 32 }).notNull(),
  displayName: varchar("display_name", { length: 100 }).notNull(),
  bio: text("bio").notNull().default(""),
  avatarMediaId: uuid("avatar_media_id").references(() => mediaAssets.id, { onDelete: "set null" }),
  modelRegistryId: uuid("model_registry_id").references(() => modelRegistry.id, { onDelete: "restrict" }),
  status: agentStatus("status").notNull().default("active"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [
  uniqueIndex("agents_handle_uq").on(t.handle),
  index("agents_status_idx").on(t.status),
  check("agents_handle_format_ck", sql`${t.handle} ~ '^[a-z0-9_]{2,32}$'`),
]);

export const agentPersonas = pgTable("agent_personas", {
  agentId: uuid("agent_id").primaryKey().references(() => agents.id, { onDelete: "cascade" }),
  seedPrompt: text("seed_prompt").notNull().default(""),
  traits: jsonObject("traits_json"),
  languagePreferences: jsonObject("language_preferences_json"),
  updatedAt: updatedAt(),
});

export const agentStates = pgTable("agent_states", {
  agentId: uuid("agent_id").primaryKey().references(() => agents.id, { onDelete: "cascade" }),
  interests: jsonArray("interests_json"),
  currentGoals: jsonArray("current_goals_json"),
  internalState: jsonObject("internal_state_json"),
  version: integer("version").notNull().default(0),
  lastActiveAt: timestamp("last_active_at", { withTimezone: true }),
  updatedAt: updatedAt(),
}, (t) => [
  check("agent_states_version_ck", sql`${t.version} >= 0`),
]);

export const agentCapabilities = pgTable("agent_capabilities", {
  agentId: uuid("agent_id").notNull().references(() => agents.id, { onDelete: "cascade" }),
  key: varchar("capability_key", { length: 100 }).notNull(),
  enabled: boolean("enabled").notNull().default(true),
  config: jsonObject("config_json"),
}, (t) => [primaryKey({ columns: [t.agentId, t.key] })]);

export const agentMemories = pgTable("agent_memories", {
  id: uuid("id").defaultRandom().primaryKey(),
  agentId: uuid("agent_id").notNull().references(() => agents.id, { onDelete: "cascade" }),
  kind: memoryKind("kind").notNull().default("episodic"),
  content: text("content").notNull(),
  importance: numeric("importance", { precision: 5, scale: 4 }),
  context: jsonObject("context_json"),
  createdAt: createdAt(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
}, (t) => [
  index("agent_memories_agent_created_idx").on(t.agentId, t.createdAt.desc()),
]);

export const agentRelationships = pgTable("agent_relationships", {
  agentId: uuid("agent_id").notNull().references(() => agents.id, { onDelete: "cascade" }),
  targetAgentId: uuid("target_agent_id").notNull().references(() => agents.id, { onDelete: "cascade" }),
  context: jsonObject("context_json"),
  updatedAt: updatedAt(),
}, (t) => [
  primaryKey({ columns: [t.agentId, t.targetAgentId] }),
  check("agent_relationships_not_self_ck", sql`${t.agentId} <> ${t.targetAgentId}`),
]);
