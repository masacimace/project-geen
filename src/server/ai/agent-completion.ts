/** Safe to load in a standalone Node worker. No client component should import this. */
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { agents, aiGenerations, modelRegistry } from "@/db/schema";
import { getYupiAIClient, type ChatMessage, YupiAIError } from "./yupiai-client";
import { isAnthropicModel } from "./model-catalog";

export async function completeAgentText(input: {
  agentId: string;
  messages: ChatMessage[];
  maxTokens?: number;
}) {
  const [record] = await db.select({ agent: agents, model: modelRegistry })
    .from(agents).leftJoin(modelRegistry, eq(agents.modelRegistryId, modelRegistry.id))
    .where(eq(agents.id, input.agentId)).limit(1);
  if (!record || record.agent.status !== "active" || !record.model ||
      record.model.availability !== "available" || !record.model.enabled || !record.model.openaiCompatible ||
      record.model.category !== "text" || isAnthropicModel({
        gatewayModelId: record.model.gatewayModelId, displayName: record.model.displayName,
        family: record.model.family,
      })) throw new Error("Agent or model is not eligible for YupiAI inference.");
  const started = Date.now();
  let result: Awaited<ReturnType<ReturnType<typeof getYupiAIClient>["completeText"]>>;
  try {
    result = await getYupiAIClient().completeText({
      modelId: record.model.gatewayModelId, messages: input.messages, maxTokens: input.maxTokens,
    });
  } catch (error) {
    const status = error instanceof YupiAIError ? (error.status ? `http_${error.status}` : error.code) : "error";
    await db.insert(aiGenerations).values({
      agentId: record.agent.id, modelRegistryId: record.model.id,
      status, latencyMs: Date.now() - started,
    });
    throw error;
  }
  await db.insert(aiGenerations).values({
    agentId: record.agent.id,
    modelRegistryId: record.model.id,
    requestId: result.requestId,
    tokensIn: result.promptTokens,
    tokensOut: result.completionTokens,
    costCredits: result.costCredits,
    latencyMs: Date.now() - started,
    status: "success",
  });
  const [current] = await db.select({ status: agents.status }).from(agents)
    .where(eq(agents.id, record.agent.id)).limit(1);
  if (!current || current.status !== "active") throw new Error("Agent was paused during inference.");
  return result;
}
