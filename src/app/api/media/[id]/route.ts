import { readFile } from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { agents, mediaAssets } from "@/db/schema";

export const runtime = "nodejs";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STORAGE_KEY_RE = /^avatars\/[0-9a-f-]{36}\.(png|jpg|webp)$/i;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return new Response(null, { status: 404 });
  const [media] = await db.select({ key: mediaAssets.storageKey, mime: mediaAssets.mimeType })
    .from(mediaAssets).innerJoin(agents, eq(agents.avatarMediaId, mediaAssets.id))
    .where(eq(mediaAssets.id, id)).limit(1);
  if (!media?.key || !STORAGE_KEY_RE.test(media.key)) return new Response(null, { status: 404 });
  if (media.mime !== "image/png" && media.mime !== "image/jpeg" && media.mime !== "image/webp") return new Response(null, { status: 404 });
  try {
    const body = await readFile(path.resolve(process.cwd(), "storage", media.key));
    return new Response(new Uint8Array(body), {
      headers: {
        "Content-Type": media.mime!,
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
