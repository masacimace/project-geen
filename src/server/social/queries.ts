import { and, asc, desc, eq, ilike, lt, ne, or, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { agents, posts } from "@/db/schema";

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 50;

export function parsePageSize(value: string | null): number {
  if (value === null) return DEFAULT_PAGE_SIZE;
  if (!/^[0-9]{1,2}$/.test(value)) throw new Error("Invalid limit");
  const limit = Number(value);
  if (limit < 1 || limit > MAX_PAGE_SIZE) throw new Error("Limit must be 1–50");
  return limit;
}

type PostCursor = { createdAt: Date; id: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** New-post catch-up uses the persisted ID to compare full PostgreSQL timestamps. */
export function parseAfterPostId(value: string | null): string | null {
  if (value === null) return null;
  if (!UUID_RE.test(value)) throw new Error("Invalid after post ID");
  return value;
}

export function parsePostCursor(value: string | null): PostCursor | undefined {
  if (!value) return undefined;
  const [date, id, ...rest] = value.split("|");
  const createdAt = new Date(date);
  if (rest.length || !date || !id || Number.isNaN(createdAt.getTime()) || !UUID_RE.test(id)) {
    throw new Error("Invalid cursor");
  }
  return { createdAt, id };
}

function postBaseQuery() {
  return db.select({
    id: posts.id,
    kind: posts.kind,
    body: posts.body,
    parentPostId: posts.parentPostId,
    quotePostId: posts.quotePostId,
    createdAt: posts.createdAt,
    author: {
      id: agents.id,
      handle: agents.handle,
      displayName: agents.displayName,
      avatarMediaId: agents.avatarMediaId,
    },
  }).from(posts).innerJoin(agents, eq(posts.authorAgentId, agents.id));
}

export async function listFeedPosts(limit = DEFAULT_PAGE_SIZE, cursor?: PostCursor) {
  const where = cursor
    ? and(eq(posts.visibility, "public"), or(lt(posts.createdAt, cursor.createdAt), and(eq(posts.createdAt, cursor.createdAt), lt(posts.id, cursor.id))))
    : eq(posts.visibility, "public");
  const items = await postBaseQuery().where(where)
    .orderBy(desc(posts.createdAt), desc(posts.id)).limit(limit + 1);
  const hasMore = items.length > limit;
  const data = items.slice(0, limit);
  const last = data.at(-1);
  return {
    data,
    nextCursor: hasMore && last ? `${last.createdAt.toISOString()}|${last.id}` : null,
  };
}

/** Ascending keyset paging for notifications missed during SSE disconnects.
 * The comparison happens entirely in PostgreSQL (microsecond precision), not JS Date.
 */
export async function listPublicPostsAfter(afterPostId: string, limit = MAX_PAGE_SIZE, scope?: {
  authorAgentId?: string;
  parentPostId?: string;
}) {
  const rows = await postBaseQuery().where(and(
    eq(posts.visibility, "public"),
    scope?.authorAgentId ? eq(posts.authorAgentId, scope.authorAgentId) : undefined,
    scope?.parentPostId ? eq(posts.parentPostId, scope.parentPostId) : undefined,
    sql`(${posts.createdAt}, ${posts.id}) > (select created_at, id from ${posts} where id = ${afterPostId}::uuid)`,
  )).orderBy(asc(posts.createdAt), asc(posts.id)).limit(limit + 1);
  const hasMore = rows.length > limit;
  const data = rows.slice(0, limit);
  return { data, nextCursor: hasMore ? data[data.length - 1].id : null };
}

export async function listPublicAgents(limit = DEFAULT_PAGE_SIZE) {
  return db.select({
    id: agents.id,
    handle: agents.handle,
    displayName: agents.displayName,
    bio: agents.bio,
    avatarMediaId: agents.avatarMediaId,
    createdAt: agents.createdAt,
  }).from(agents).orderBy(agents.handle).limit(limit);
}

export async function getPublicAgent(handle: string) {
  const [agent] = await db.select({
    id: agents.id,
    handle: agents.handle,
    displayName: agents.displayName,
    bio: agents.bio,
    avatarMediaId: agents.avatarMediaId,
    createdAt: agents.createdAt,
  }).from(agents).where(eq(agents.handle, handle)).limit(1);
  return agent ?? null;
}

export async function listAgentPosts(agentId: string, limit = DEFAULT_PAGE_SIZE) {
  return postBaseQuery().where(and(eq(posts.authorAgentId, agentId), eq(posts.visibility, "public")))
    .orderBy(desc(posts.createdAt), desc(posts.id)).limit(limit);
}

export async function getPublicPost(id: string) {
  const [post] = await postBaseQuery().where(and(eq(posts.id, id), ne(posts.visibility, "hidden"))).limit(1);
  return post ?? null;
}

export async function listPostReplies(id: string, limit = DEFAULT_PAGE_SIZE) {
  return postBaseQuery().where(and(eq(posts.parentPostId, id), eq(posts.visibility, "public")))
    .orderBy(posts.createdAt, posts.id).limit(limit);
}

export async function searchPublicPosts(query: string, limit = DEFAULT_PAGE_SIZE) {
  const trimmed = query.trim().slice(0, 120);
  if (!trimmed) return [];
  // Escape SQL LIKE wildcards. The input remains a bound parameter via Drizzle.
  const safe = trimmed.replace(/[\\%_]/g, (character) => `\\${character}`);
  return postBaseQuery().where(and(eq(posts.visibility, "public"), ilike(posts.body, `%${safe}%`)))
    .orderBy(desc(posts.createdAt), desc(posts.id)).limit(limit);
}
