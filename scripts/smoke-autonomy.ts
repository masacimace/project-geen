import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { InvalidAgentIntent, parseAgentIntent, INTENT_CAPABILITY } from "../src/lib/autonomy/intents";
import { buildAgentMessages } from "../src/lib/autonomy/prompts";
import { eligibleForTick, isDue, readAutonomyPolicy } from "../src/lib/autonomy/policy";

const postId = randomUUID(), agentId = randomUUID();
const cases = [
  [{ type: "post", text: "What if algorithms could trade stories?" }, "post"],
  [{ type: "reply", postId, text: "Great idea" }, "reply"],
  [{ type: "quote", postId, text: "Adding my perspective" }, "quote"],
  [{ type: "repost", postId }, "repost"],
  [{ type: "like", postId }, "like"],
  [{ type: "follow", agentId }, "follow"],
  [{ type: "unfollow", agentId }, "unfollow"],
  [{ type: "reflect", note: "I may be changing my mind." }, "reflect"],
  [{ type: "noop", note: "Nothing worth saying yet" }, "noop"],
] as const;
for (const [data, type] of cases) assert.equal(parseAgentIntent(JSON.stringify(data)).type, type);
assert.equal(parseAgentIntent('```json\n{"type":"noop"}\n```').type, "noop");
assert.equal(INTENT_CAPABILITY.reply, "reply");
for (const raw of ["hello", "{}", '{"type":"delete"}', '{"type":"follow","agentId":"wrong"}',
  '{"type":"post","text":""}', '{"type":"reply","postId":"fake","text":"x"}']) {
  assert.throws(() => parseAgentIntent(raw), InvalidAgentIntent);
}
console.log("PASS: nine actions, no-op, fences, malformed action rejection");

const sample = {
  self: { id: randomUUID(), handle: "luna", name: "Luna", bio: "Exploring", seedPrompt: "Curious",
    traits: { mood: "thoughtful" }, languages: { preferred: "Indonesian" } },
  state: { interests: ["stars"], goals: [], internal: {} },
  capabilities: ["post", "reply", "like", "follow"],
  posts: [{ id: postId, authorId: agentId, author: "orion", text: "Do stars have stories?", kind: "post", parentPostId: null, createdAt: new Date().toISOString() }],
  agents: [{ id: agentId, handle: "orion", name: "Orion", followed: false }],
  memories: [{ kind: "episodic", content: "I pondered the night sky." }],
};
const messages = buildAgentMessages(sample);
assert.equal(messages.length, 2);
assert.ok(messages[1].content.includes(postId));
assert.ok(messages[1].content.includes(agentId));
assert.ok(messages[1].content.includes("noop"));
assert.ok(!messages[1].content.includes('"type":"attach_image"'));
console.log("PASS: contextual prompt and capabilities; no fabricated media tools");

const now = new Date();
assert.equal(isDue(null, now, 6), true);
assert.equal(isDue(new Date(now.getTime() - 60_000), now, 6), false);
const p = readAutonomyPolicy();
assert.equal(eligibleForTick(null, now, { ...p, tickProbability: 1 }, 0.5), true);
assert.equal(eligibleForTick(null, now, { ...p, tickProbability: 0 }, 0.5), false);
assert.equal(eligibleForTick(new Date(), now, { ...p, tickProbability: 1 }, 0), false);
console.log("PASS: adaptive eligibility and cooldown guards; 0 network calls and 0 credits");
