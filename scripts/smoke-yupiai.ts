import assert from "node:assert/strict";
import { createYupiAIClient, YupiAIError } from "../src/server/ai/yupiai-client";
import { parseYupiAIModelCatalog } from "../src/server/ai/model-catalog";

/** Zero network requests, zero credits, zero database writes. */
async function main() {
  const received: string[] = [];
  const fakeFetch: typeof fetch = async (request, init) => {
    const url = String(request);
    received.push(url);
    assert.equal((init?.headers as Record<string, string>).Authorization, "Bearer test-secret");
    if (url.endsWith("/models")) {
      return new Response(JSON.stringify({ data: [
        { id: "deepseek/test-text", name: "DeepSeek Test", owned_by: "deepseek" },
        { id: "qwen/test-text", name: "Qwen Test", owned_by: "qwen" },
        { id: "anthropic/claude-sonnet-test", name: "Claude", owned_by: "anthropic" },
        { id: "meta/test-embedding", name: "Meta Embed", category: "embedding" },
        { id: "nvidia/decider-1", name: "Decider", category: "decisions" },
      ] }), { headers: { "content-type": "application/json" } });
    }
    const json = JSON.parse(String(init?.body)) as { model: string };
    assert.ok(url.endsWith("/chat/completions"));
    if (json.model === "fake/rate-limited") return new Response("{}", { status: 429, headers: { "retry-after": "2" } });
    if (json.model === "fake/no-credits") return new Response("{}", { status: 402 });
    return new Response(JSON.stringify({
      id: "chatcmpl_mock", model: json.model,
      choices: [{ message: { role: "assistant", content: "OK" } }],
      usage: { prompt_tokens: 9, completion_tokens: 1, cost: 0.01234567 },
    }), { headers: { "content-type": "application/json", "x-yupiai-request-id": "request_mock" } });
  };
  const client = createYupiAIClient({ baseURL: "https://mock.example.test/v1", apiKey: "test-secret", fetchImpl: fakeFetch });
  const catalog = parseYupiAIModelCatalog(await client.listModels());
  assert.equal(catalog.models.length, 2);
  assert.equal(catalog.excluded, 3);
  assert.ok(catalog.models.every(m => !/claude|embed|decider/.test(m.gatewayModelId)));
  console.log("PASS: model sync parser excludes Anthropic and non-text models");

  const result = await client.completeText({
    modelId: "qwen/test-text", messages: [{ role: "user", content: "Test" }], maxTokens: 32,
  });
  assert.equal(result.text, "OK");
  assert.equal(result.requestId, "request_mock");
  assert.equal(result.promptTokens, 9);
  assert.equal(result.completionTokens, 1);
  assert.equal(result.costCredits, "0.01234567");
  console.log("PASS: OpenAI-compatible chat completion, request ID, credits normalization");

  for (const [modelId, expectedStatus] of [["fake/rate-limited", 429], ["fake/no-credits", 402]] as const) {
    await assert.rejects(
      client.completeText({ modelId, messages: [{ role: "user", content: "Test" }] }),
      (error: unknown) => error instanceof YupiAIError && error.status === expectedStatus &&
        (expectedStatus !== 429 || error.retryAfterSeconds === 2),
    );
  }
  console.log("PASS: provider errors and Retry-After surfaced without retrying paid requests");
  assert.deepEqual(received, [
    "https://mock.example.test/v1/models",
    "https://mock.example.test/v1/chat/completions",
    "https://mock.example.test/v1/chat/completions",
    "https://mock.example.test/v1/chat/completions",
  ]);
  console.log("PASS: all requests use only /v1/models and /v1/chat/completions");
}

main().catch(error => { console.error("YupiAI adapter smoke FAILED:", error); process.exitCode = 1; });
