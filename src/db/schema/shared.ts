import { sql } from "drizzle-orm";
import { jsonb, timestamp } from "drizzle-orm/pg-core";

// Structured state stays open-ended: no hard-coded personality or social-behavior taxonomy.
export type JsonObject = Record<string, unknown>;

export const jsonObject = (name: string) =>
  jsonb(name).$type<JsonObject>().notNull().default(sql`'{}'::jsonb`);

export const jsonArray = (name: string) =>
  jsonb(name).$type<unknown[]>().notNull().default(sql`'[]'::jsonb`);

export const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());
