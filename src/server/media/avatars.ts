import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_DIMENSION = 2048;

export type PreparedAvatar = {
  storageKey: string;
  mimeType: "image/png" | "image/jpeg" | "image/webp";
  width: number;
  height: number;
};

function jpegDimensions(data: Buffer): { width: number; height: number } | null {
  if (data.length < 4 || data[0] !== 0xff || data[1] !== 0xd8) return null;
  let i = 2;
  while (i + 4 < data.length) {
    if (data[i] !== 0xff) return null;
    while (data[i] === 0xff) i++;
    const marker = data[i++];
    if (marker === 0xd9 || marker === 0xda) break;
    if (marker >= 0xd0 && marker <= 0xd7) continue;
    if (marker === 0x01) continue;
    if (i + 2 > data.length) break;
    const len = data.readUInt16BE(i);
    if (len < 2 || i + len > data.length) return null;
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      if (len < 7) return null;
      return { height: data.readUInt16BE(i + 3), width: data.readUInt16BE(i + 5) };
    }
    i += len;
  }
  return null;
}

function imageInfo(data: Buffer): { mimeType: PreparedAvatar["mimeType"]; ext: string; width: number; height: number } | null {
  if (data.length >= 24 && data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    if (data.toString("ascii", 12, 16) !== "IHDR") return null;
    return { mimeType: "image/png", ext: "png", width: data.readUInt32BE(16), height: data.readUInt32BE(20) };
  }
  const jpeg = jpegDimensions(data);
  if (jpeg) return { mimeType: "image/jpeg", ext: "jpg", ...jpeg };
  if (data.length >= 30 && data.toString("ascii", 0, 4) === "RIFF" && data.toString("ascii", 8, 12) === "WEBP") {
    const format = data.toString("ascii", 12, 16);
    if (format === "VP8X") {
      return {
        mimeType: "image/webp", ext: "webp",
        width: 1 + data.readUIntLE(24, 3), height: 1 + data.readUIntLE(27, 3),
      };
    }
    if (format === "VP8L" && data[20] === 0x2f) {
      const width = 1 + (data[21] | ((data[22] & 0x3f) << 8));
      const height = 1 + ((data[22] >> 6) | (data[23] << 2) | ((data[24] & 0x0f) << 10));
      return { mimeType: "image/webp", ext: "webp", width, height };
    }
    if (format === "VP8 " && data[23] === 0x9d && data[24] === 0x01 && data[25] === 0x2a) {
      return {
        mimeType: "image/webp", ext: "webp",
        width: data.readUInt16LE(26) & 0x3fff,
        height: data.readUInt16LE(28) & 0x3fff,
      };
    }
  }
  return null;
}

export async function prepareAvatarUpload(value: FormDataEntryValue | null): Promise<PreparedAvatar | null> {
  if (!(value instanceof File) || value.size === 0) return null;
  if (value.size > MAX_FILE_BYTES) throw new Error("Avatar maksimal 2 MB.");
  const buffer = Buffer.from(await value.arrayBuffer());
  const info = imageInfo(buffer);
  if (!info || (value.type && value.type !== info.mimeType)) {
    throw new Error("Avatar harus PNG, JPEG, atau WebP yang valid.");
  }
  if (info.width < 1 || info.height < 1 || info.width > MAX_DIMENSION || info.height > MAX_DIMENSION) {
    throw new Error("Dimensi avatar maksimal 2048 × 2048 piksel.");
  }
  const storageKey = `avatars/${randomUUID()}.${info.ext}`;
  const root = path.resolve(process.cwd(), "storage");
  const directory = path.join(root, "avatars");
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(root, storageKey), buffer, { flag: "wx", mode: 0o600 });
  return { storageKey, mimeType: info.mimeType, width: info.width, height: info.height };
}

export async function cleanupAvatar(avatar: PreparedAvatar | null): Promise<void> {
  if (!avatar) return;
  try { await unlink(path.resolve(process.cwd(), "storage", avatar.storageKey)); }
  catch (error) { console.error("Avatar cleanup failed", error); }
}
