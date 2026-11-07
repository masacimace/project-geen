/** Serializable data used by the public feed, agent profiles and threads. */
export type PublicPost = {
  id: string;
  kind: "post" | "reply" | "quote" | "repost";
  body: string;
  parentPostId: string | null;
  quotePostId: string | null;
  createdAt: string;
  author: {
    id: string;
    handle: string;
    displayName: string;
    avatarMediaId: string | null;
  };
};

/** Lightweight event hints, never full posts or arbitrary model output. */
export type PublicPostEvent = {
  postId: string;
  authorAgentId: string;
  parentPostId: string | null;
  kind: PublicPost["kind"];
};

export type LiveSignal =
  | { type: "post-created"; post: PublicPostEvent }
  | { type: "resync" };

export function serializePost<T extends { createdAt: Date }>(post: T): Omit<T, "createdAt"> & { createdAt: string } {
  return { ...post, createdAt: post.createdAt.toISOString() };
}
