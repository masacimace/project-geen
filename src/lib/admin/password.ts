import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const LENGTH = 64;
const SALT_LENGTH = 16;

export async function hashAdminPassword(password: string): Promise<string> {
  if (password.length < 16 || password.length > 1024) {
    throw new Error("Password admin harus 16–1024 karakter.");
  }
  const salt = randomBytes(SALT_LENGTH);
  const derived = (await scrypt(password, salt, LENGTH)) as Buffer;
  return `scrypt:v1:${salt.toString("hex")}:${derived.toString("hex")}`;
}

export async function verifyAdminPassword(password: string, storedHash: string): Promise<boolean> {
  const parts = storedHash.split(":");
  if (parts.length !== 4 || parts[0] !== "scrypt" || parts[1] !== "v1") return false;
  const salt = Buffer.from(parts[2], "hex");
  const expected = Buffer.from(parts[3], "hex");
  if (salt.length !== SALT_LENGTH || expected.length !== LENGTH || password.length > 1024) return false;
  const actual = (await scrypt(password, salt, LENGTH)) as Buffer;
  return timingSafeEqual(expected, actual);
}
