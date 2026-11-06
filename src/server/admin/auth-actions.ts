"use server";

import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { adminLoginThrottles, adminUsers } from "@/db/schema";
import { verifyAdminPassword } from "@/lib/admin/password";
import { createAdminSession, revokeAdminSession } from "./session";

export type LoginResult = { error: string };
const INVALID = "Email atau password tidak cocok.";
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 6;

function identifierDigest(email: string): string {
  return createHash("sha256").update(email).digest("hex");
}

export async function loginAdmin(_previous: LoginResult, formData: FormData): Promise<LoginResult> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (email.length < 3 || email.length > 254 || password.length > 1024 || !password) return { error: INVALID };

  const identifierHash = identifierDigest(email);
  const now = new Date();
  const [throttle] = await db.select().from(adminLoginThrottles)
    .where(eq(adminLoginThrottles.identifierHash, identifierHash)).limit(1);
  if (throttle?.blockedUntil && throttle.blockedUntil > now) {
    return { error: "Terlalu banyak percobaan. Coba lagi setelah 15 menit." };
  }

  const [user] = await db.select().from(adminUsers).where(eq(adminUsers.email, email)).limit(1);
  // Dummy verification equalizes work for unknown and known emails.
  const fakeHash = "scrypt:v1:e7119d8e81aa7b4ad14a5d0ec0b31fb9:49d4f8e11710b5405e171d81702c971bb365235acc4bdc9abf81df5f30c2f4f91db1b6046eec10eb8570a9cd67591f4f18b43cd87f53a2d78d6e13ee5b2c5e80";
  const valid = await verifyAdminPassword(password, user?.passwordHash ?? fakeHash);
  if (!user || !valid) {
    const start = throttle?.windowStartedAt ?? now;
    const inWindow = now.getTime() - start.getTime() < WINDOW_MS;
    const attempts = inWindow ? (throttle?.attempts ?? 0) + 1 : 1;
    await db.insert(adminLoginThrottles).values({
      identifierHash,
      attempts,
      windowStartedAt: inWindow ? start : now,
      blockedUntil: attempts >= MAX_ATTEMPTS ? new Date(now.getTime() + WINDOW_MS) : null,
    }).onConflictDoUpdate({ target: adminLoginThrottles.identifierHash, set: {
      attempts,
      windowStartedAt: inWindow ? start : now,
      blockedUntil: attempts >= MAX_ATTEMPTS ? new Date(now.getTime() + WINDOW_MS) : null,
    } });
    return { error: INVALID };
  }

  await db.delete(adminLoginThrottles).where(eq(adminLoginThrottles.identifierHash, identifierHash));
  await createAdminSession(user.id);
  redirect("/admin");
}

export async function logoutAdmin(): Promise<void> {
  await revokeAdminSession();
  redirect("/admin/login");
}
