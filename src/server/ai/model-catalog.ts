/** Mapping is intentionally conservative: listing != verified Chat Completions compatibility. */
export type TextModelCandidate = {
  gatewayModelId: string;
  displayName: string;
  family: string;
  capabilities: Record<string, unknown>;
  pricing: Record<string, unknown>;
};

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : null;
}
function short(value: unknown, length = 250): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed && trimmed.length <= length ? trimmed : null;
}
function safeRecord(value: unknown): Record<string, unknown> {
  const obj = record(value);
  if (!obj) return {};
  try { return JSON.stringify(obj).length < 12_000 ? obj : {}; }
  catch { return {}; }
}

/** Exclude Anthropic regardless of whether that model also exposes an OpenAI-style route. */
export function isAnthropicModel(input: {
  gatewayModelId: string; displayName: string; family: string;
}): boolean {
  return /anthropic|claude|sonnet|haiku|opus/i.test(
    [input.gatewayModelId, input.displayName, input.family].join(" "),
  );
}

const nonTextKinds = new Set([
  "embedding", "embeddings", "embed", "rerank", "reranker", "reranking",
  "decisions", "decision", "image", "images", "audio", "speech", "video",
  "tts", "asr", "transcription",
]);
const nonTextName = /(?:^|[./_\s-])(embedding|embeddings|embed|rerank|reranker|reranking|decider|decision|image-gen|text-to-image|video-gen|text-to-video|speech|tts|stt|transcription|whisper|flux|sora|veo)(?:$|[./_\s-])/i;

/**
 * Supports common OpenAI model-list envelopes. Unknown response shapes fail rather
 * than accidentally disabling previously synced models.
 */
export function parseYupiAIModelCatalog(payload: unknown): {
  models: TextModelCandidate[];
  excluded: number;
  total: number;
} {
  const root = record(payload);
  const data = record(root?.data);
  const list = Array.isArray(payload) ? payload
    : Array.isArray(root?.data) ? root.data
    : Array.isArray(root?.models) ? root.models
    : Array.isArray(data?.models) ? data.models : null;
  if (!list || list.length > 3000) throw new Error("Format /models YupiAI tidak dikenali.");
  const models = new Map<string, TextModelCandidate>();
  let excluded = 0;
  for (const item of list) {
    const raw = record(item);
    const id = short(raw?.id, 250);
    if (!id) { excluded++; continue; }
    const displayName = short(raw?.display_name, 250) ?? short(raw?.name, 250) ?? id;
    const owner = record(raw?.provider);
    const family = short(raw?.provider, 100) ?? short(owner?.name, 100) ??
      short(raw?.owned_by, 100) ?? short(raw?.family, 100) ??
      (id.includes("/") ? id.split("/")[0].slice(0, 100) : "unknown");
    const candidate = { gatewayModelId: id, displayName, family };
    const category = short(raw?.category, 60)?.toLowerCase() ?? short(raw?.type, 60)?.toLowerCase();
    if (isAnthropicModel(candidate) || (category && nonTextKinds.has(category)) ||
        nonTextName.test(id) || nonTextName.test(displayName) ||
        /(?:router|switchyard)/i.test(`${id} ${displayName}`)) {
      excluded++;
      continue;
    }
    // Unknown catalog categories are only imported as candidates (disabled).
    // Never infer OpenAI compatibility from a model name or PDF screenshot.
    models.set(id, {
      ...candidate,
      capabilities: {
        catalog: safeRecord(raw?.capabilities),
        supportedParameters: Array.isArray(raw?.supported_parameters)
          ? raw.supported_parameters.filter((v): v is string => typeof v === "string").slice(0, 100) : [],
        reportedCategory: category ?? null,
        verification: "pending",
      },
      pricing: safeRecord(raw?.pricing),
    });
  }
  // Zero accepted models is treated as a suspicious response; don't revoke
  // historical availability in the DB based on an incompatible/partial list.
  if (models.size === 0) throw new Error("Model text tidak ditemukan dalam respons YupiAI. Sync dibatalkan.");
  return { models: [...models.values()], excluded, total: list.length };
}
