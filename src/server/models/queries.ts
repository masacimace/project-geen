import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { modelRegistry } from "@/db/schema";

// A single YupiAI gateway; Anthropic-family and non-OpenAI-compatible models
// are never selectable for GEEN text agents.
export async function listSelectableTextModels() {
  return db.select({
    id: modelRegistry.id,
    gatewayModelId: modelRegistry.gatewayModelId,
    displayName: modelRegistry.displayName,
    capabilities: modelRegistry.capabilities,
  }).from(modelRegistry).where(and(
    eq(modelRegistry.category, "text"),
    eq(modelRegistry.openaiCompatible, true),
    eq(modelRegistry.enabled, true),
    eq(modelRegistry.availability, "available"),
    sql`lower(${modelRegistry.family}) <> 'anthropic'`,
  )).orderBy(modelRegistry.displayName);
}
