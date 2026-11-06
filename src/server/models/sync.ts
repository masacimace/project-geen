import "server-only";

import { eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { modelRegistry, worldEvents } from "@/db/schema";
import { getYupiAIClient } from "@/server/ai/yupiai-client";
import { isAnthropicModel, parseYupiAIModelCatalog } from "@/server/ai/model-catalog";

export async function syncYupiAIModels(adminId: string) {
  const payload = await getYupiAIClient().listModels();
  const catalog = parseYupiAIModelCatalog(payload);
  const now = new Date();

  await db.transaction(async (tx) => {
    const old = await tx.select().from(modelRegistry);
    const previousByGatewayId = new Map(old.map(row => [row.gatewayModelId, row]));
    // API response has been parsed successfully; now missing IDs may be marked unavailable.
    await tx.update(modelRegistry).set({ availability: "unavailable" });
    for (const candidate of catalog.models) {
      const previous = previousByGatewayId.get(candidate.gatewayModelId);
      const oldCapabilities = previous?.capabilities ?? {};
      const capabilities = {
        ...oldCapabilities,
        ...candidate.capabilities,
        // Only explicit chat verification can set verification=verified.
        verification: previous?.openaiCompatible ? "verified" : "pending",
        verifiedAt: oldCapabilities.verifiedAt ?? null,
      };
      await tx.insert(modelRegistry).values({
        gatewayModelId: candidate.gatewayModelId,
        displayName: candidate.displayName,
        family: candidate.family,
        category: "text",
        openaiCompatible: false,
        enabled: false,
        availability: "available",
        capabilities,
        pricing: candidate.pricing,
        lastSyncedAt: now,
      }).onConflictDoUpdate({
        target: modelRegistry.gatewayModelId,
        set: {
          displayName: candidate.displayName,
          family: candidate.family,
          category: "text",
          availability: "available",
          capabilities,
          pricing: candidate.pricing,
          lastSyncedAt: now,
        },
      });
    }
    await tx.insert(worldEvents).values({
      type: "admin.models.synced",
      payload: { actorId: adminId, total: catalog.total, imported: catalog.models.length, excluded: catalog.excluded },
    });
  });
  return { total: catalog.total, imported: catalog.models.length, excluded: catalog.excluded };
}

export async function verifyYupiAIModel(modelId: string, adminId: string) {
  const [model] = await db.select().from(modelRegistry).where(eq(modelRegistry.id, modelId)).limit(1);
  if (!model || model.category !== "text" || model.availability !== "available" ||
      isAnthropicModel({ gatewayModelId: model.gatewayModelId, displayName: model.displayName, family: model.family })) {
    throw new Error("Model tidak tersedia untuk verifikasi OpenAI-compatible.");
  }
  // Explicit, opt-in, potentially paid request. No automatic probe during catalog sync.
  const started = Date.now();
  const result = await getYupiAIClient().completeText({
    modelId: model.gatewayModelId,
    messages: [{ role: "user", content: "Reply with exactly one word: OK" }],
    maxTokens: 32,
  });
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx.update(modelRegistry).set({
      openaiCompatible: true,
      enabled: true,
      capabilities: { ...model.capabilities, verification: "verified", verifiedAt: now.toISOString() },
    }).where(eq(modelRegistry.id, model.id));
    await tx.insert(worldEvents).values({
      type: "admin.model.verified",
      payload: {
        actorId: adminId, modelId: model.id, gatewayModelId: model.gatewayModelId,
        requestId: result.requestId, tokensIn: result.promptTokens, tokensOut: result.completionTokens,
        costCredits: result.costCredits, latencyMs: Date.now() - started,
      },
    });
  });
  return result;
}

export async function setYupiAIModelEnabled(modelId: string, enabled: boolean, adminId: string) {
  const [model] = await db.select().from(modelRegistry).where(eq(modelRegistry.id, modelId)).limit(1);
  if (!model) throw new Error("Model tidak ditemukan.");
  if (enabled && (!model.openaiCompatible || model.availability !== "available" || model.category !== "text" ||
    isAnthropicModel({ gatewayModelId: model.gatewayModelId, displayName: model.displayName, family: model.family }))) {
    throw new Error("Model perlu diverifikasi melalui Chat Completions sebelum diaktifkan.");
  }
  await db.transaction(async tx => {
    await tx.update(modelRegistry).set({ enabled }).where(eq(modelRegistry.id, modelId));
    await tx.insert(worldEvents).values({
      type: "admin.model.toggled", payload: { actorId: adminId, modelId, enabled },
    });
  });
}

export async function getModelRegistryStats() {
  const [counts] = await db.select({
    all: sql<number>`count(*)::int`,
    eligible: sql<number>`count(*) filter (where ${modelRegistry.enabled} and ${modelRegistry.openaiCompatible} and ${modelRegistry.availability} = 'available')::int`,
    verified: sql<number>`count(*) filter (where ${modelRegistry.openaiCompatible})::int`,
    unavailable: sql<number>`count(*) filter (where ${modelRegistry.availability} = 'unavailable')::int`,
  }).from(modelRegistry);
  return counts;
}
