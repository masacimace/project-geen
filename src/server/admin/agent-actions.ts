"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { agents, agentCapabilities, agentPersonas, agentStates, mediaAssets, worldEvents } from "@/db/schema";
import { prepareAvatarUpload, cleanupAvatar, type PreparedAvatar } from "@/server/media/avatars";
import { findAssignableModel } from "./agents";
import { AGENT_CAPABILITIES } from "@/lib/agent-capabilities";
import { requireAdminSession } from "./session";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export type AgentFormResult = { error: string };

function field(data: FormData, name: string, max: number): string {
  const value = data.get(name);
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max + 1);
}

function parseAgentForm(data: FormData, allowError = false) {
  const displayName = field(data, "displayName", 100);
  const handle = field(data, "handle", 32).toLowerCase();
  const bio = field(data, "bio", 1000);
  const seedPrompt = field(data, "seedPrompt", 8000);
  const notes = field(data, "traits", 2000);
  const interests = field(data, "interests", 2000).split(/[,\n]/).map(s => s.trim()).filter(Boolean).slice(0, 30);
  const language = field(data, "language", 120);
  const modelId = field(data, "modelRegistryId", 36);
  if (!displayName || displayName.length > 100) throw new Error("Nama agent wajib diisi (maks. 100 karakter).");
  if (!/^[a-z0-9_]{2,32}$/.test(handle)) throw new Error("Username harus 2–32 karakter: huruf kecil, angka, underscore.");
  if (bio.length > 1000 || seedPrompt.length > 8000 || notes.length > 2000 || language.length > 120) {
    throw new Error("Teks melebihi batas field yang diizinkan.");
  }
  if (modelId && !UUID_RE.test(modelId)) throw new Error("Model tidak valid.");
  const status = field(data, "status", 6);
  if (status !== "active" && status !== "paused" && !(allowError && status === "error")) throw new Error("Status tidak valid.");
  return {
    displayName, handle, bio, seedPrompt, notes, interests, language,
    modelId: modelId || null,
    status: status as "active" | "paused" | "error",
    capabilities: AGENT_CAPABILITIES.map((capability) => ({
      key: capability.key,
      enabled: data.get(`cap:${capability.key}`) === "on" && capability.key !== "attach_gif",
    })),
  };
}

function errorMessage(error: unknown) {
  if (error instanceof Error && [
    "Nama agent", "Username", "Teks", "Model", "Status", "Avatar", "Dimensi",
  ].some(prefix => error.message.startsWith(prefix))) return error.message;
  const pg = error as { code?: string; cause?: { code?: string } };
  if (pg?.code === "23505" || pg?.cause?.code === "23505") return "Username sudah digunakan oleh agent lain.";
  console.error("Agent management failed", error);
  return "Tidak bisa menyimpan agent. Cek koneksi database dan log server.";
}

export async function createAgent(_previous: AgentFormResult, formData: FormData): Promise<AgentFormResult> {
  const actor = await requireAdminSession();
  let avatar: PreparedAvatar | null = null;
  let newAgentId: string;
  try {
    const input = parseAgentForm(formData);
    if (input.modelId && !(await findAssignableModel(input.modelId))) {
      throw new Error("Model belum eligible/terverifikasi untuk YupiAI OpenAI-compatible.");
    }
    avatar = await prepareAvatarUpload(formData.get("avatar"));
    newAgentId = await db.transaction(async (tx) => {
      let avatarMediaId: string | null = null;
      if (avatar) {
        const [media] = await tx.insert(mediaAssets).values({
          type: "image", origin: "upload", storageKey: avatar.storageKey,
          mimeType: avatar.mimeType, width: avatar.width, height: avatar.height,
        }).returning({ id: mediaAssets.id });
        avatarMediaId = media.id;
      }
      const [agent] = await tx.insert(agents).values({
        displayName: input.displayName, handle: input.handle, bio: input.bio,
        modelRegistryId: input.modelId, avatarMediaId, status: input.status,
      }).returning({ id: agents.id });
      await tx.insert(agentPersonas).values({
        agentId: agent.id, seedPrompt: input.seedPrompt,
        traits: { notes: input.notes, seedInterests: input.interests },
        languagePreferences: { preferred: input.language },
      });
      await tx.insert(agentStates).values({ agentId: agent.id, interests: input.interests });
      await tx.insert(agentCapabilities).values(input.capabilities.map(cap => ({ agentId: agent.id, ...cap })));
      await tx.insert(worldEvents).values({
        type: "admin.agent.created",
        payload: { agentId: agent.id, actorId: actor.id, initialStatus: input.status },
      });
      return agent.id;
    });
  } catch (error) {
    await cleanupAvatar(avatar);
    return { error: errorMessage(error) };
  }
  revalidatePath("/admin");
  revalidatePath("/admin/agents");
  revalidatePath("/agents");
  redirect(`/admin/agents/${newAgentId}`);
}

export async function updateAgent(agentId: string, _previous: AgentFormResult, formData: FormData): Promise<AgentFormResult> {
  const actor = await requireAdminSession();
  if (!UUID_RE.test(agentId)) return { error: "Agent tidak valid." };
  let avatar: PreparedAvatar | null = null;
  try {
    const input = parseAgentForm(formData, true);
    const [existing] = await db.select({ id: agents.id, modelRegistryId: agents.modelRegistryId }).from(agents).where(eq(agents.id, agentId)).limit(1);
    if (!existing) return { error: "Agent tidak ditemukan." };
    if (input.modelId && input.modelId !== existing.modelRegistryId && !(await findAssignableModel(input.modelId))) {
      throw new Error("Model belum eligible/terverifikasi untuk YupiAI OpenAI-compatible.");
    }
    avatar = await prepareAvatarUpload(formData.get("avatar"));
    await db.transaction(async (tx) => {
      let avatarMediaId: string | undefined;
      if (avatar) {
        const [media] = await tx.insert(mediaAssets).values({
          type: "image", origin: "upload", storageKey: avatar.storageKey,
          mimeType: avatar.mimeType, width: avatar.width, height: avatar.height,
        }).returning({ id: mediaAssets.id });
        avatarMediaId = media.id;
      }
      await tx.update(agents).set({
        displayName: input.displayName, handle: input.handle, bio: input.bio,
        modelRegistryId: input.modelId, status: input.status,
        ...(avatarMediaId ? { avatarMediaId } : {}),
      }).where(eq(agents.id, agentId));
      await tx.insert(agentPersonas).values({
        agentId, seedPrompt: input.seedPrompt,
        traits: { notes: input.notes, seedInterests: input.interests },
        languagePreferences: { preferred: input.language },
      }).onConflictDoUpdate({ target: agentPersonas.agentId, set: {
        seedPrompt: input.seedPrompt,
        traits: { notes: input.notes, seedInterests: input.interests },
        languagePreferences: { preferred: input.language },
      } });
      // Deliberately never reset agentStates, memories or social relationships on edit.
      for (const cap of input.capabilities) {
        await tx.insert(agentCapabilities).values({ agentId, ...cap }).onConflictDoUpdate({
          target: [agentCapabilities.agentId, agentCapabilities.key],
          set: { enabled: cap.enabled },
        });
      }
      await tx.insert(worldEvents).values({
        type: "admin.agent.updated", payload: { agentId, actorId: actor.id },
      });
    });
  } catch (error) {
    await cleanupAvatar(avatar);
    return { error: errorMessage(error) };
  }
  revalidatePath("/admin/agents");
  revalidatePath(`/admin/agents/${agentId}`);
  revalidatePath("/agents");
  redirect(`/admin/agents/${agentId}`);
}

export async function changeAgentStatus(agentId: string, status: "active" | "paused"): Promise<void> {
  const actor = await requireAdminSession();
  if (!UUID_RE.test(agentId)) throw new Error("Invalid agent ID");
  if (status !== "active" && status !== "paused") throw new Error("Invalid status");
  await db.transaction(async (tx) => {
    const [agent] = await tx.update(agents).set({ status }).where(eq(agents.id, agentId)).returning({ id: agents.id });
    if (!agent) throw new Error("Agent not found");
    await tx.insert(worldEvents).values({
      type: `admin.agent.${status}`, payload: { agentId, actorId: actor.id },
    });
  });
  revalidatePath("/admin");
  revalidatePath("/admin/agents");
  revalidatePath(`/admin/agents/${agentId}`);
}
