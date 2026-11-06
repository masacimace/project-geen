import { boolean, index, pgEnum, pgTable, text, uniqueIndex, uuid, varchar, timestamp } from "drizzle-orm/pg-core";
import { createdAt, jsonObject, updatedAt } from "./shared";

export const modelCategory = pgEnum("model_category", ["text", "embedding", "rerank", "decisions"]);
export const modelAvailability = pgEnum("model_availability", ["unknown", "available", "unavailable"]);

export const modelRegistry = pgTable("model_registry", {
  id: uuid("id").defaultRandom().primaryKey(),
  gatewayModelId: text("gateway_model_id").notNull(),
  displayName: text("display_name").notNull(),
  family: varchar("family", { length: 100 }).notNull(),
  category: modelCategory("category").notNull().default("text"),
  openaiCompatible: boolean("openai_compatible").notNull().default(false),
  enabled: boolean("enabled").notNull().default(false),
  availability: modelAvailability("availability").notNull().default("unknown"),
  capabilities: jsonObject("capabilities_json"),
  pricing: jsonObject("pricing_json"),
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [
  uniqueIndex("model_registry_gateway_model_id_uq").on(t.gatewayModelId),
  index("model_registry_eligibility_idx").on(t.category, t.enabled, t.openaiCompatible),
]);
