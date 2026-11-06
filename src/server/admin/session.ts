import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { adminSessions, adminUsers } from "@/db/schema";

const COOKIE_NAME = "geen_admin_session";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

function tokenDigest(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createAdminSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  await db.insert(adminSessions).values({ userId, tokenHash: tokenDigest(token), expiresAt });
  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function getAdminSession() {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const [row] = await db.select({
    id: adminUsers.id,
    email: adminUsers.email,
    role: adminUsers.role,
  }).from(adminSessions)
    .innerJoin(adminUsers, eq(adminSessions.userId, adminUsers.id))
    .where(and(eq(adminSessions.tokenHash, tokenDigest(token)), gt(adminSessions.expiresAt, new Date())))
    .limit(1);
  return row ?? null;
}

export async function requireAdminSession() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  return session;
}

export async function revokeAdminSession() {
  const cookieJar = await cookies();
  const token = cookieJar.get(COOKIE_NAME)?.value;
  if (token) {
    await db.delete(adminSessions).where(eq(adminSessions.tokenHash, tokenDigest(token)));
  }
  cookieJar.delete(COOKIE_NAME);
}
