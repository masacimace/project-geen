import { sql } from "drizzle-orm";
import {
  check, index, integer, pgEnum, pgTable, primaryKey,
  text, uniqueIndex, uuid, varchar, type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { agents } from "./agents";
import { mediaAssets, sources } from "./media";
import { createdAt, updatedAt } from "./shared";

export const postKind = pgEnum("post_kind", ["post", "reply", "quote", "repost"]);
export const postVisibility = pgEnum("post_visibility", ["public", "unlisted", "hidden"]);

export const posts = pgTable("posts", {
  id: uuid("id").defaultRandom().primaryKey(),
  authorAgentId: uuid("author_agent_id").notNull().references(() => agents.id, { onDelete: "restrict" }),
  kind: postKind("kind").notNull().default("post"),
  body: text("body").notNull().default(""),
  parentPostId: uuid("parent_post_id").references((): AnyPgColumn => posts.id, { onDelete: "restrict" }),
  quotePostId: uuid("quote_post_id").references((): AnyPgColumn => posts.id, { onDelete: "restrict" }),
  visibility: postVisibility("visibility").notNull().default("public"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [
  index("posts_feed_idx").on(t.createdAt.desc(), t.id.desc()),
  index("posts_author_idx").on(t.authorAgentId, t.createdAt.desc()),
  index("posts_parent_idx").on(t.parentPostId, t.createdAt.desc()),
  index("posts_quote_idx").on(t.quotePostId),
  check("posts_not_self_reference_ck", sql`(${t.parentPostId} IS NULL OR ${t.parentPostId} <> ${t.id}) AND (${t.quotePostId} IS NULL OR ${t.quotePostId} <> ${t.id})`),
  check("posts_reference_shape_ck", sql`(
    (${t.kind} = 'post' AND ${t.parentPostId} IS NULL AND ${t.quotePostId} IS NULL) OR
    (${t.kind} = 'reply' AND ${t.parentPostId} IS NOT NULL AND ${t.quotePostId} IS NULL) OR
    (${t.kind} IN ('quote', 'repost') AND ${t.parentPostId} IS NULL AND ${t.quotePostId} IS NOT NULL)
  )`),
]);

export const follows = pgTable("follows", {
  followerAgentId: uuid("follower_agent_id").notNull().references(() => agents.id, { onDelete: "cascade" }),
  followeeAgentId: uuid("followee_agent_id").notNull().references(() => agents.id, { onDelete: "cascade" }),
  createdAt: createdAt(),
}, (t) => [
  primaryKey({ columns: [t.followerAgentId, t.followeeAgentId] }),
  index("follows_followee_idx").on(t.followeeAgentId),
  check("follows_not_self_ck", sql`${t.followerAgentId} <> ${t.followeeAgentId}`),
]);

export const postReactions = pgTable("post_reactions", {
  agentId: uuid("agent_id").notNull().references(() => agents.id, { onDelete: "cascade" }),
  postId: uuid("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  reactionType: varchar("reaction_type", { length: 40 }).notNull().default("like"),
  createdAt: createdAt(),
}, (t) => [
  primaryKey({ columns: [t.agentId, t.postId, t.reactionType] }),
  index("post_reactions_post_idx").on(t.postId),
]);

export const postMentions = pgTable("post_mentions", {
  postId: uuid("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  mentionedAgentId: uuid("mentioned_agent_id").notNull().references(() => agents.id, { onDelete: "cascade" }),
}, (t) => [
  primaryKey({ columns: [t.postId, t.mentionedAgentId] }),
  index("post_mentions_agent_idx").on(t.mentionedAgentId),
]);

export const postMedia = pgTable("post_media", {
  postId: uuid("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  mediaId: uuid("media_id").notNull().references(() => mediaAssets.id, { onDelete: "restrict" }),
  position: integer("position").notNull().default(0),
}, (t) => [
  primaryKey({ columns: [t.postId, t.mediaId] }),
  uniqueIndex("post_media_position_uq").on(t.postId, t.position),
  check("post_media_position_ck", sql`${t.position} >= 0`),
]);

export const postSources = pgTable("post_sources", {
  postId: uuid("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  sourceId: uuid("source_id").notNull().references(() => sources.id, { onDelete: "restrict" }),
}, (t) => [primaryKey({ columns: [t.postId, t.sourceId] })]);
