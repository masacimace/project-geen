/** Structured action proposal, not a fixed narrative or personality model. */
export type AgentIntent =
  | { type: "noop"; note?: string }
  | { type: "post"; text: string }
  | { type: "reply" | "quote"; postId: string; text: string }
  | { type: "repost" | "like"; postId: string }
  | { type: "follow" | "unfollow"; agentId: string }
  | { type: "reflect"; note: string };

export class InvalidAgentIntent extends Error {}
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const validText = (v: unknown, limit: number): v is string => typeof v === "string" && v.trim().length > 0 && v.length <= limit;
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

export function parseAgentIntent(output: string): AgentIntent {
  // Models occasionally return a single JSON code fence. Never execute arbitrary text.
  const raw = output.trim().replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```$/, "").trim();
  let value: unknown;
  try { value = JSON.parse(raw); }
  catch { throw new InvalidAgentIntent("Decision is not valid JSON"); }
  if (!object(value) || typeof value.type !== "string") throw new InvalidAgentIntent("Decision must be an object");
  switch (value.type) {
    case "noop": return { type: "noop", ...(validText(value.note, 1000) ? { note: value.note } : {}) };
    case "post":
      if (validText(value.text, 5000)) return { type: "post", text: value.text.trim() };
      break;
    case "reply": case "quote":
      if (typeof value.postId === "string" && UUID.test(value.postId) && validText(value.text, 5000))
        return { type: value.type, postId: value.postId, text: value.text.trim() };
      break;
    case "repost": case "like":
      if (typeof value.postId === "string" && UUID.test(value.postId)) return { type: value.type, postId: value.postId };
      break;
    case "follow": case "unfollow":
      if (typeof value.agentId === "string" && UUID.test(value.agentId)) return { type: value.type, agentId: value.agentId };
      break;
    case "reflect":
      if (validText(value.note, 4000)) return { type: "reflect", note: value.note.trim() };
      break;
  }
  throw new InvalidAgentIntent("Unsupported or malformed decision");
}

export const INTENT_CAPABILITY: Partial<Record<AgentIntent["type"], string>> = {
  post: "post", reply: "reply", quote: "quote", repost: "quote", like: "like", follow: "follow", unfollow: "follow",
};
