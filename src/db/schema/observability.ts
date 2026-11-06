import { sql } from "drizzle-orm";
import {
  check, index, integer, numeric, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid, varchar,
} from "drizzle-orm/pg-core";
import { agents } from "./agents";
import { modelRegistry } from "./models";
import { createdAt, jsonObject } from "./shared";

export const worldEvents = pgTable("world_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  type: varchar("type", { length: 100 }).notNull(),
  payload: jsonObject("payload_json"),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("world_events_occurred_idx").on(t.occurredAt.desc())]);

export const agentActivities = pgTable("agent_activities", {
  id: uuid("id").defaultRandom().primaryKey(),
  agentId: uuid("agent_id").notNull().references(() => agents.id, { onDelete: "restrict" }),
  stimulusId: text("stimulus_id"),
  intentType: varchar("intent_type", { length: 100 }).notNull(),
  outcome: varchar("outcome", { length: 60 }).notNull(),
  summary: text("summary"),
  correlationId: text("correlation_id"),
  createdAt: createdAt(),
}, (t) => [index("agent_activities_agent_created_idx").on(t.agentId, t.createdAt.desc())]);

export const aiGenerations = pgTable("ai_generations", {
  id: uuid("id").defaultRandom().primaryKey(),
  agentId: uuid("agent_id").notNull().references(() => agents.id, { onDelete: "restrict" }),
  modelRegistryId: uuid("model_registry_id").notNull().references(() => modelRegistry.id, { onDelete: "restrict" }),
  requestId: text("request_id"),
  tokensIn: integer("tokens_in"),
  tokensOut: integer("tokens_out"),
  costCredits: numeric("cost_credits", { precision: 22, scale: 8 }),
  latencyMs: integer("latency_ms"),
  status: varchar("status", { length: 60 }).notNull(),
  createdAt: createdAt(),
}, (t) => [
  uniqueIndex("ai_generations_request_uq").on(t.requestId),
  index("ai_generations_agent_created_idx").on(t.agentId, t.createdAt.desc()),
  check("ai_generations_usage_ck", sql`(${t.tokensIn} IS NULL OR ${t.tokensIn} >= 0) AND (${t.tokensOut} IS NULL OR ${t.tokensOut} >= 0) AND (${t.costCredits} IS NULL OR ${t.costCredits} >= 0) AND (${t.latencyMs} IS NULL OR ${t.latencyMs} >= 0)`),
]);

export const toolExecutions = pgTable("tool_executions", {
  id: uuid("id").defaultRandom().primaryKey(),
  agentId: uuid("agent_id").notNull().references(() => agents.id, { onDelete: "restrict" }),
  toolName: varchar("tool_name", { length: 120 }).notNull(),
  sanitizedArgs: jsonObject("sanitized_args_json"),
  outcome: varchar("outcome", { length: 60 }).notNull(),
  durationMs: integer("duration_ms"),
  createdAt: createdAt(),
}, (t) => [index("tool_executions_agent_created_idx").on(t.agentId, t.createdAt.desc())]);

export const budgetScope = pgEnum("budget_scope", ["global", "agent"]);
export const budgetPeriod = pgEnum("budget_period", ["day", "week", "month", "lifetime"]);
export const budgetMode = pgEnum("budget_mode", ["observe", "stop"]);

export const budgetPolicies = pgTable("budget_policies", {
  id: uuid("id").defaultRandom().primaryKey(),
  scope: budgetScope("scope").notNull(),
  scopeId: uuid("scope_id").references(() => agents.id, { onDelete: "cascade" }),
  period: budgetPeriod("period").notNull(),
  mode: budgetMode("mode").notNull().default("observe"),
  creditLimit: numeric("credit_limit", { precision: 22, scale: 8 }).notNull(),
  createdAt: createdAt(),
}, (t) => [
  uniqueIndex("budget_policies_global_period_uq").on(t.period).where(sql`${t.scope} = 'global'`),
  uniqueIndex("budget_policies_agent_period_uq").on(t.scopeId, t.period).where(sql`${t.scope} = 'agent'`),
  check("budget_policies_positive_ck", sql`${t.creditLimit} >= 0`),
  check("budget_policies_scope_ck", sql`(${t.scope} = 'global' AND ${t.scopeId} IS NULL) OR (${t.scope} = 'agent' AND ${t.scopeId} IS NOT NULL)`),
]);
