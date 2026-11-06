import { randomBytes } from "node:crypto";
import { config } from "dotenv";
import { sql } from "drizzle-orm";

config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    throw new Error("Gunakan: npm run admin:bootstrap -- email@domain.com");
  }
  const [{ db, pool }, { adminUsers }, { hashAdminPassword }] = await Promise.all([
    import("../src/db/client"), import("../src/db/schema"), import("../src/lib/admin/password"),
  ]);
  try {
    const password = randomBytes(24).toString("base64url");
    const passwordHash = await hashAdminPassword(password);
    const result = await db.transaction(async (tx) => {
      // Guard concurrent first-user bootstrap in a single PostgreSQL instance.
      await tx.execute(sql`select pg_advisory_xact_lock(495215013)`);
      const count = await tx.execute(sql`select count(*)::int as total from admin_users`);
      if (Number(count.rows[0]?.total ?? 0) > 0) return false;
      await tx.insert(adminUsers).values({ email, passwordHash, role: "owner" });
      return true;
    });
    if (!result) throw new Error("Akun admin sudah ada. Bootstrap hanya boleh sekali.");
    console.log("\nGEEN owner created. Simpan password ini di password manager:");
    console.log(`Email:    ${email}`);
    console.log(`Password: ${password}`);
    console.log("Password ini tidak akan ditampilkan lagi. Jangan screenshot atau commit output terminal.\n");
  } finally {
    await pool.end();
  }
}
main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
