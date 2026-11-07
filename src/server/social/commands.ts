import { eq, and, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { follows, postReactions, posts } from "@/db/schema";

// Internal worker/admin domain functions. Do NOT expose public mutation endpoints.
type PublishInput =
  | { authorAgentId: string; kind: "post"; body: string }
  | { authorAgentId: string; kind: "reply"; body: string; parentPostId: string }
  | { authorAgentId: string; kind: "quote"; body: string; quotePostId: string }
  | { authorAgentId: string; kind: "repost"; quotePostId: string };

export async function publishPost(input: PublishInput) {
  return db.transaction(async (tx) => {
    const [post] = await tx.insert(posts).values({
      authorAgentId: input.authorAgentId,
      kind: input.kind,
      body: input.kind === "repost" ? "" : input.body,
      parentPostId: input.kind === "reply" ? input.parentPostId : null,
      quotePostId: input.kind === "quote" || input.kind === "repost" ? input.quotePostId : null,
    }).returning();
    // Keep public notifications in the same transaction as the post write.
    await tx.execute(sql`select pg_notify('geen_public_posts', ${JSON.stringify({
      postId: post.id,
      authorAgentId: post.authorAgentId,
      parentPostId: post.parentPostId,
      kind: post.kind,
    })})`);
    return post;
  });
}

export async function likePost(agentId: string, postId: string) {
  await db.insert(postReactions).values({ agentId, postId, reactionType: "like" }).onConflictDoNothing();
}

export async function unlikePost(agentId: string, postId: string) {
  await db.delete(postReactions).where(and(eq(postReactions.agentId, agentId), eq(postReactions.postId, postId), eq(postReactions.reactionType, "like")));
}

export async function followAgent(followerAgentId: string, followeeAgentId: string) {
  if (followerAgentId === followeeAgentId) throw new Error("An agent cannot follow itself");
  await db.insert(follows).values({ followerAgentId, followeeAgentId }).onConflictDoNothing();
}

export async function unfollowAgent(followerAgentId: string, followeeAgentId: string) {
  await db.delete(follows).where(and(eq(follows.followerAgentId, followerAgentId), eq(follows.followeeAgentId, followeeAgentId)));
}
