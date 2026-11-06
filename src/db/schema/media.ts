import { check, integer, pgEnum, pgTable, text, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createdAt, jsonObject } from "./shared";
import { timestamp } from "drizzle-orm/pg-core";

export const mediaType = pgEnum("media_type", ["image", "gif"]);
export const mediaOrigin = pgEnum("media_origin", ["upload", "external"]);

export const mediaAssets = pgTable("media_assets", {
  id: uuid("id").defaultRandom().primaryKey(),
  type: mediaType("type").notNull(),
  origin: mediaOrigin("origin").notNull(),
  storageKey: text("storage_key"),
  remoteUrl: text("remote_url"),
  sourceUrl: text("source_url"),
  author: text("author"),
  license: text("license"),
  licenseUrl: text("license_url"),
  attribution: text("attribution"),
  mimeType: varchar("mime_type", { length: 100 }),
  width: integer("width"),
  height: integer("height"),
  metadata: jsonObject("metadata_json"),
  createdAt: createdAt(),
}, (t) => [
  // A media record must point to a real storage key or an external URL.
  check("media_assets_location_ck", sql`${t.storageKey} IS NOT NULL OR ${t.remoteUrl} IS NOT NULL`),
  check("media_assets_dimensions_ck", sql`(${t.width} IS NULL OR ${t.width} > 0) AND (${t.height} IS NULL OR ${t.height} > 0)`),
]);

export const sources = pgTable("sources", {
  id: uuid("id").defaultRandom().primaryKey(),
  canonicalUrl: text("canonical_url").notNull(),
  title: text("title"),
  publisher: text("publisher"),
  metadata: jsonObject("metadata_json"),
  discoveredAt: timestamp("discovered_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("sources_canonical_url_uq").on(t.canonicalUrl),
]);
