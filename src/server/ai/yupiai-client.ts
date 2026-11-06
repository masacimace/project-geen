/**
 * GEEN's only inference transport: YupiAI OpenAI-compatible routes.
 * Uses native fetch so request IDs / cost fields are not lost in an SDK abstraction.
 * This module must only be imported by server code or CLI scripts.
 */

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type TextCompletion = {
  text: string;
  modelId: string;
  requestId: string | null;
  promptTokens: number | null;
  completionTokens: number | null;
  costCredits: string | null;
};

export class YupiAIError extends Error {
  constructor(
    message: string,
    readonly code: "config" | "network" | "invalid_response" | "provider",
    readonly status: number | null = null,
    readonly retryAfterSeconds: number | null = null,
  ) {
    super(message);
    this.name = "YupiAIError";
  }
}

function object(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : null;
}

function nonNegativeInt(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

/** Numeric credits are stored as DECIMAL strings; never convert to a currency amount. */
function creditAmount(value: unknown): string | null {
  const numberValue = typeof value === "number" ? value :
    typeof value === "string" && /^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value) ? Number(value) : NaN;
  if (!Number.isFinite(numberValue) || numberValue < 0 || numberValue >= 1e14) return null;
  return numberValue.toFixed(8);
}

function retryAfter(header: string | null): number | null {
  if (!header) return null;
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.min(Math.ceil(seconds), 3600);
  const date = Date.parse(header);
  return Number.isNaN(date) ? null : Math.max(0, Math.min(Math.ceil((date - Date.now()) / 1000), 3600));
}

export function createYupiAIClient(options: {
  baseURL: string;
  apiKey: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}) {
  const { apiKey, fetchImpl = fetch, timeoutMs = 45_000 } = options;
  if (!apiKey.trim()) throw new YupiAIError("YUPIAI_API_KEY belum diatur.", "config");
  if (!options.baseURL.trim()) throw new YupiAIError("YUPIAI_BASE_URL belum diatur.", "config");
  let base: URL;
  try {
    base = new URL(options.baseURL);
  } catch {
    throw new YupiAIError("YUPIAI_BASE_URL harus berupa URL HTTPS yang valid.", "config");
  }
  if (base.protocol !== "https:" || base.username || base.password || base.search || base.hash ||
      !base.pathname.replace(/\/+$/, "").endsWith("/v1")) {
    throw new YupiAIError("YUPIAI_BASE_URL harus menggunakan HTTPS dan berakhir dengan /v1.", "config");
  }
  const endpointBase = `${base.origin}${base.pathname.replace(/\/+$/, "")}/`;

  async function request(path: "models" | "chat/completions", body?: unknown) {
    let response: Response;
    try {
      response = await fetchImpl(new URL(path, endpointBase), {
        method: body === undefined ? "GET" : "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json",
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: AbortSignal.timeout(timeoutMs),
        cache: "no-store",
      });
    } catch {
      throw new YupiAIError("Koneksi YupiAI gagal atau timeout. Periksa gateway dan jaringan.", "network");
    }

    if (!response.ok) {
      // Never leak upstream response bodies: they can include sensitive details.
      throw new YupiAIError(
        `YupiAI mengembalikan HTTP ${response.status}.`,
        "provider", response.status, retryAfter(response.headers.get("retry-after")),
      );
    }
    const mediaType = response.headers.get("content-type") || "";
    if (mediaType && !mediaType.toLowerCase().includes("json")) {
      throw new YupiAIError("YupiAI mengembalikan format respons yang tidak didukung.", "invalid_response");
    }
    const rawText = await response.text();
    if (rawText.length > 8_000_000) throw new YupiAIError("Respons YupiAI terlalu besar.", "invalid_response");
    let payload: unknown;
    try { payload = JSON.parse(rawText); }
    catch { throw new YupiAIError("JSON YupiAI tidak valid.", "invalid_response"); }
    return { payload, requestId: response.headers.get("x-yupiai-request-id") ?? response.headers.get("x-request-id") };
  }

  return {
    async listModels(): Promise<unknown> {
      return (await request("models")).payload;
    },

    async completeText(input: {
      modelId: string;
      messages: ChatMessage[];
      maxTokens?: number;
    }): Promise<TextCompletion> {
      if (!input.modelId || !input.messages.length ||
        input.messages.some(m => !["system", "user", "assistant"].includes(m.role) || !m.content.trim())) {
        throw new YupiAIError("Model atau messages tidak valid.", "config");
      }
      if (input.maxTokens !== undefined && (!Number.isInteger(input.maxTokens) || input.maxTokens < 1 || input.maxTokens > 8192)) {
        throw new YupiAIError("maxTokens harus berada pada rentang 1–8192.", "config");
      }
      const { payload, requestId } = await request("chat/completions", {
        model: input.modelId,
        messages: input.messages,
        stream: false,
        ...(input.maxTokens === undefined ? {} : { max_tokens: input.maxTokens }),
      });
      const data = object(payload);
      const choices = Array.isArray(data?.choices) ? data.choices : [];
      const choice = object(choices[0]);
      const message = object(choice?.message);
      const content = message?.content;
      const text = typeof content === "string" ? content : Array.isArray(content)
        ? content.map(part => {
          const item = object(part);
          return item?.type === "text" && typeof item.text === "string" ? item.text : "";
        }).join("") : "";
      if (!text.trim()) throw new YupiAIError("Chat completion tidak menghasilkan teks.", "invalid_response");
      const usage = object(data?.usage);
      const usageCost = object(usage?.cost)?.total ?? usage?.cost ?? data?.cost;
      return {
        text,
        modelId: typeof data?.model === "string" ? data.model : input.modelId,
        requestId: requestId ?? (typeof data?.id === "string" ? data.id : null),
        promptTokens: nonNegativeInt(usage?.prompt_tokens),
        completionTokens: nonNegativeInt(usage?.completion_tokens),
        costCredits: creditAmount(usageCost),
      };
    },
  };
}

export function getYupiAIClient() {
  return createYupiAIClient({
    baseURL: process.env.YUPIAI_BASE_URL ?? "",
    apiKey: process.env.YUPIAI_API_KEY ?? "",
  });
}

export function isYupiAIConfigured() {
  return Boolean(process.env.YUPIAI_BASE_URL?.trim() && process.env.YUPIAI_API_KEY?.trim());
}
