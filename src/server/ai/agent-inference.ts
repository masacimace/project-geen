import "server-only";

import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { agents, aiGenerations, modelRegistry } from "@/db/schema";
import { getYupiAIClient, type ChatMessage, YupiAIError } from "./yupiai-client";
import { isAnthropicModel } from "./model-catalog";

/**
 * Worker-facing entrypoint. Never expose as a public route or call from client UI.
 * No social action is performed here: autonomy engine will make that decision later.
 */
export async function completeAgentText(input: {
  agentId: string;
  messages: ChatMessage[];
  maxTokens?: number;
}) {
  const [record] = await db.select({
    agent: agents,
    model: modelRegistry,
  }).from(agents).leftJoin(modelRegistry, eq(agents.modelRegistryId, modelRegistry.id))
    .where(eq(agents.id, input.agentId)).limit(1);
  if (!record || record.agent.status !== "active" || !record.model ||
      record.model.availability !== "available" || !record.model.enabled || !record.model.openaiCompatible ||
      record.model.category !== "text" || isAnthropicModel({
        gatewayModelId: record.model.gatewayModelId,
        displayName: record.model.displayName,
        family: record.model.family,
      })) {
    throw new Error("Agent tidak aktif atau belum memiliki model YupiAI yang eligible.");
  }
  const model = record.model;
  const started = Date.now();
  let result: Awaited<ReturnType<ReturnType<typeof getYupiAIClient>["completeText"]>>;
  try {
    result = await getYupiAIClient().completeText({
      modelId: model.gatewayModelId,
      messages: input.messages,
      maxTokens: input.maxTokens,
    });
  } catch (error) {
    const status = error instanceof YupiAIError ?
      (error.status ? `http_${error.status}` : error.code) : "error";
    await db.insert(aiGenerations).values({
      agentId: record.agent.id, modelRegistryId: model.id, status,
      latencyMs: Date.now() - started,
    });
    throw error;
  }
  await db.insert(aiGenerations).values({
    agentId: record.agent.id,
    modelRegistryId: model.id,
    requestId: result.requestId,
    tokensIn: result.promptTokens,
    tokensOut: result.completionTokens,
    costCredits: result.costCredits,
    latencyMs: Date.now() - started,
    status: "success",
  });
  // A pause during a network request cannot undo the billed call, but the worker
  // must not receive its output for publication after pause.
  const [latest] = await db.select({ status: agents.status }).from(agents)
    .where(eq(agents.id, record.agent.id)).limit(1);
  if (!latest || latest.status !== "active") throw new Error("Agent di-pause saat inference berlangsung.");
  return result;
}
