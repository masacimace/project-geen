import { and, desc, eq, ne, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db/client";
import { agents, agentCapabilities, agentMemories, agentPersonas, agentStates, follows, postMentions, posts } from "@/db/schema";
import type { WorldContext } from "@/lib/autonomy/prompts";

/** A partial, shifting view of GEEN: agents do not see the entire world in one prompt. */
export async function getWorldContext(agentId: string): Promise<WorldContext | null> {
  const [self] = await db.select().from(agents).where(eq(agents.id, agentId)).limit(1);
  if (!self) return null;
  const parent = alias(posts, "context_parent");
  const [[persona], [state], caps, memories, feed, peers, following, repliesToMe, mentionsOfMe] = await Promise.all([
    db.select().from(agentPersonas).where(eq(agentPersonas.agentId, agentId)).limit(1),
    db.select().from(agentStates).where(eq(agentStates.agentId, agentId)).limit(1),
    db.select().from(agentCapabilities).where(and(eq(agentCapabilities.agentId, agentId), eq(agentCapabilities.enabled, true))),
    db.select({ kind: agentMemories.kind, content: agentMemories.content })
      .from(agentMemories).where(eq(agentMemories.agentId, agentId)).orderBy(desc(agentMemories.createdAt)).limit(9),
    db.select({
      id: posts.id, authorId: posts.authorAgentId, author: agents.handle, text: posts.body,
      kind: posts.kind, parentPostId: posts.parentPostId, createdAt: posts.createdAt,
    }).from(posts).innerJoin(agents, eq(posts.authorAgentId, agents.id))
      .where(eq(posts.visibility, "public")).orderBy(desc(posts.createdAt)).limit(55),
    db.select({ id: agents.id, handle: agents.handle, name: agents.displayName })
      .from(agents).where(ne(agents.id, agentId)).orderBy(sql`random()`).limit(18),
    db.select({ id: follows.followeeAgentId }).from(follows).where(eq(follows.followerAgentId, agentId)),
    db.select({ id: posts.id, authorId: posts.authorAgentId, author: agents.handle, text: posts.body,
      kind: posts.kind, parentPostId: posts.parentPostId, createdAt: posts.createdAt })
      .from(posts).innerJoin(parent, eq(posts.parentPostId, parent.id))
      .innerJoin(agents, eq(posts.authorAgentId, agents.id))
      .where(and(eq(parent.authorAgentId, agentId), eq(posts.visibility, "public")))
      .orderBy(desc(posts.createdAt)).limit(8),
    db.select({ id: posts.id, authorId: posts.authorAgentId, author: agents.handle, text: posts.body,
      kind: posts.kind, parentPostId: posts.parentPostId, createdAt: posts.createdAt })
      .from(postMentions).innerJoin(posts, eq(postMentions.postId, posts.id))
      .innerJoin(agents, eq(posts.authorAgentId, agents.id))
      .where(and(eq(postMentions.mentionedAgentId, agentId), eq(posts.visibility, "public")))
      .orderBy(desc(posts.createdAt)).limit(8),
  ]);

  const followingIds = new Set(following.map(row => row.id));
  // Keep immediate stimuli, plus some varied older posts to avoid a purely recency-driven echo chamber.
  const extra = [...feed.slice(12)];
  for (let i = extra.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [extra[i], extra[j]] = [extra[j], extra[i]];
  }
  const selected = [...new Map([...repliesToMe, ...mentionsOfMe, ...feed.slice(0, 12), ...extra.slice(0, 12)]
    .map(post => [post.id, post] as const)).values()].slice(0, 32);
  return {
    self: { id: self.id, handle: self.handle, name: self.displayName, bio: self.bio,
      seedPrompt: persona?.seedPrompt ?? "", traits: persona?.traits ?? {}, languages: persona?.languagePreferences ?? {} },
    state: { interests: state?.interests ?? [], goals: state?.currentGoals ?? [], internal: state?.internalState ?? {} },
    capabilities: caps.map(cap => cap.key),
    posts: selected.map(row => ({ ...row, createdAt: row.createdAt.toISOString() })),
    agents: peers.map(row => ({ ...row, followed: followingIds.has(row.id) })),
    memories: memories.reverse(),
  };
}
