"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { YupiAIError } from "@/server/ai/yupiai-client";
import { setYupiAIModelEnabled, syncYupiAIModels, verifyYupiAIModel } from "@/server/models/sync";
import { requireAdminSession } from "./session";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function toNotice(error: unknown): string {
  if (error instanceof YupiAIError) {
    if (error.code === "config") return "Isi YUPIAI_API_KEY dan YUPIAI_BASE_URL di .env.local terlebih dahulu.";
    if (error.status === 401) return "API key YupiAI ditolak (401).";
    if (error.status === 402) return "Saldo kredit YupiAI tidak cukup (402).";
    if (error.status === 403) return "YupiAI menolak akses (403). Periksa paket dan izin model.";
    if (error.status === 429) return `Rate limit YupiAI (429).${error.retryAfterSeconds !== null ? ` Coba lagi dalam ${error.retryAfterSeconds} detik.` : ""}`;
    return `Gateway YupiAI gagal: ${error.status ? `HTTP ${error.status}` : error.code}.`;
  }
  if (error instanceof Error && (
    error.message.startsWith("Model tidak") || error.message.startsWith("Model perlu") ||
    error.message.startsWith("Format /models") || error.message.startsWith("Model text")
  )) return error.message;
  console.error("Model management failed", error);
  return "Operasi model gagal. Periksa server log dan konfigurasi gateway.";
}
function destination(key: "notice" | "error", value: string) {
  return `/admin/models?${key}=${encodeURIComponent(value.slice(0, 250))}`;
}
function invalidate() {
  revalidatePath("/admin/models");
  revalidatePath("/admin/agents/new");
  revalidatePath("/admin/agents");
  revalidatePath("/admin/usage");
}

export async function syncModelsAction(): Promise<void> {
  const admin = await requireAdminSession();
  let result: Awaited<ReturnType<typeof syncYupiAIModels>>;
  try { result = await syncYupiAIModels(admin.id); }
  catch (error) { redirect(destination("error", toNotice(error))); }
  invalidate();
  redirect(destination("notice", `${result.imported} kandidat text disinkronkan; ${result.excluded} entri diabaikan. Verifikasi model untuk mengaktifkannya.`));
}

export async function verifyModelAction(modelId: string): Promise<void> {
  const admin = await requireAdminSession();
  if (!UUID_RE.test(modelId)) redirect(destination("error", "Model ID tidak valid."));
  try { await verifyYupiAIModel(modelId, admin.id); }
  catch (error) { redirect(destination("error", toNotice(error))); }
  invalidate();
  redirect(destination("notice", "Chat Completions berhasil; model sekarang verified dan enabled."));
}

export async function toggleModelAction(modelId: string, enabled: boolean): Promise<void> {
  const admin = await requireAdminSession();
  if (!UUID_RE.test(modelId)) redirect(destination("error", "Model ID tidak valid."));
  try { await setYupiAIModelEnabled(modelId, enabled, admin.id); }
  catch (error) { redirect(destination("error", toNotice(error))); }
  invalidate();
  redirect(destination("notice", enabled ? "Model diaktifkan." : "Model dinonaktifkan."));
}
