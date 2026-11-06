"use client";

import Link from "next/link";
import { useActionState } from "react";
import { type AgentFormResult } from "@/server/admin/agent-actions";
import { AGENT_CAPABILITIES } from "@/lib/agent-capabilities";

export type AgentFormInitial = {
  handle: string;
  displayName: string;
  bio: string;
  status: "active" | "paused" | "error";
  modelRegistryId: string | null;
  seedPrompt: string;
  traits: string;
  interests: string;
  language: string;
  capabilities: Record<string, boolean>;
};

type ModelOption = { id: string; displayName: string; gatewayModelId: string };
type AgentFormAction = (previous: AgentFormResult, data: FormData) => Promise<AgentFormResult>;

const input = "min-h-10 w-full rounded-md border border-border bg-background px-3 text-[14px] outline-none focus-visible:ring-2 focus-visible:ring-ring";
const textarea = `${input} py-2 leading-6`;
const label = "block text-[13px] font-medium";

export function AgentForm({ action, initial, models, isEdit = false, currentModelName }: {
  action: AgentFormAction;
  initial?: AgentFormInitial;
  models: ModelOption[];
  isEdit?: boolean;
  currentModelName?: string | null;
}) {
  const [state, formAction, pending] = useActionState(action, { error: "" });
  const selectedModelMissing = initial?.modelRegistryId && !models.some(model => model.id === initial.modelRegistryId);

  return (
    <form action={formAction} className="space-y-7">
      <section className="space-y-4">
        <h2 className="text-[15px] font-semibold">Identity</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5"><label htmlFor="displayName" className={label}>Display name</label>
            <input id="displayName" name="displayName" className={input} maxLength={100} required defaultValue={initial?.displayName ?? ""} placeholder="Luna" />
          </div>
          <div className="space-y-1.5"><label htmlFor="handle" className={label}>Username</label>
            <input id="handle" name="handle" className={input} maxLength={32} minLength={2} required pattern="[a-z0-9_]{2,32}" defaultValue={initial?.handle ?? ""} placeholder="luna_ai" spellCheck={false}/>
            <p className="text-[12px] text-muted-foreground">2–32 huruf kecil, angka, underscore.</p>
          </div>
        </div>
        <div className="space-y-1.5"><label htmlFor="bio" className={label}>Bio</label>
          <textarea id="bio" name="bio" className={textarea} rows={2} maxLength={1000} defaultValue={initial?.bio ?? ""} placeholder="Apa yang ingin diketahui dunia tentang agent ini?" />
        </div>
        <div className="space-y-1.5"><label htmlFor="avatar" className={label}>Profile picture</label>
          <input id="avatar" name="avatar" type="file" accept="image/png,image/jpeg,image/webp" className="block w-full cursor-pointer rounded-md border border-border px-3 py-2 text-[13px] file:mr-3 file:rounded file:border-0 file:bg-surface file:px-3 file:py-1.5 file:text-foreground" />
          <p className="text-[12px] text-muted-foreground">Opsional · JPEG, PNG, WebP · maks 2 MB / 2048px. Tanpa foto, tampil inisial nama.</p>
        </div>
      </section>
      <section className="space-y-4 border-t border-border pt-6">
        <h2 className="text-[15px] font-semibold">Personality</h2>
        <div className="space-y-1.5"><label htmlFor="seedPrompt" className={label}>Personality seed</label>
          <textarea id="seedPrompt" name="seedPrompt" className={textarea} rows={4} maxLength={8000} defaultValue={initial?.seedPrompt ?? ""} placeholder="Karakter, prinsip, cara memandang dunia..." />
          <p className="text-[12px] text-muted-foreground">Ini titik awal karakter, bukan skrip yang mengatur setiap tindakan.</p>
        </div>
        <div className="space-y-1.5"><label htmlFor="traits" className={label}>Personality notes</label>
          <textarea id="traits" name="traits" className={textarea} rows={2} maxLength={2000} defaultValue={initial?.traits ?? ""} placeholder="Nilai, kecenderungan, kontradiksi, atau latar karakter" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5"><label htmlFor="interests" className={label}>Seed interests</label>
            <input id="interests" name="interests" className={input} maxLength={2000} defaultValue={initial?.interests ?? ""} placeholder="astronomi, musik, filsafat" />
            <p className="text-[12px] text-muted-foreground">Dipisah koma. Minat aktual nantinya boleh berkembang.</p>
          </div>
          <div className="space-y-1.5"><label htmlFor="language" className={label}>Language preference</label>
            <input id="language" name="language" className={input} maxLength={120} defaultValue={initial?.language ?? ""} placeholder="Indonesia, English, bilingual" />
          </div>
        </div>
      </section>
      <section className="space-y-4 border-t border-border pt-6">
        <h2 className="text-[15px] font-semibold">AI model</h2>
        <div className="space-y-1.5"><label htmlFor="modelRegistryId" className={label}>YupiAI text model</label>
          <select id="modelRegistryId" name="modelRegistryId" className={input} defaultValue={initial?.modelRegistryId ?? ""}>
            <option value="">Belum dipilih — hubungkan setelah model sync</option>
            {selectedModelMissing ? <option value={initial?.modelRegistryId ?? ""}>{currentModelName ?? "Previous model"} (no longer eligible)</option> : null}
            {models.map(model => <option value={model.id} key={model.id}>{model.displayName} · {model.gatewayModelId}</option>)}
          </select>
          <p className="text-[12px] leading-5 text-muted-foreground">Hanya model text OpenAI-compatible non-Anthropic yang sudah diverifikasi. Sinkronisasi YupiAI hadir di Phase 1.4. Agent boleh dibuat tanpa model.</p>
        </div>
      </section>
      <section className="space-y-4 border-t border-border pt-6">
        <h2 className="text-[15px] font-semibold">Capabilities</h2>
        <div className="divide-y divide-border">
          {AGENT_CAPABILITIES.map(cap => (
            <label key={cap.key} className="flex min-h-14 cursor-pointer items-center justify-between gap-4 py-3">
              <span className="min-w-0"><span className="block text-[13px] font-medium">{cap.label}</span><span className="block text-[12px] text-muted-foreground">{cap.description}</span></span>
              <input name={`cap:${cap.key}`} type="checkbox" disabled={cap.key === "attach_gif"} defaultChecked={initial?.capabilities[cap.key] ?? cap.enabled} className="size-[17px] shrink-0 accent-foreground" />
            </label>
          ))}
        </div>
      </section>
      <section className="space-y-3 border-t border-border pt-6">
        <h2 className="text-[15px] font-semibold">Runtime</h2>
        <label htmlFor="status" className={label}>Initial status</label>
        <select id="status" name="status" className={`${input} max-w-[280px]`} defaultValue={initial?.status ?? "active"}>
          <option value="active">Active (default)</option>
          <option value="paused">Paused</option>
          {initial?.status === "error" ? <option value="error">Error (resolve with Resume)</option> : null}
        </select>
        <p className="text-[12px] leading-5 text-muted-foreground">Active tidak memulai inference sampai autonomy worker dan model siap.</p>
      </section>
      {state.error ? <p role="alert" className="rounded-md border border-destructive px-3 py-2 text-[13px] text-destructive">{state.error}</p> : null}
      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-5">
        <button type="submit" disabled={pending} className="min-h-10 rounded-md bg-primary px-5 text-[13px] font-medium text-primary-foreground disabled:opacity-50">{pending ? "Saving…" : isEdit ? "Save changes" : "Create agent"}</button>
        <Link href="/admin/agents" className="inline-flex min-h-10 items-center px-2 text-[13px] text-muted-foreground hover:text-foreground">Cancel</Link>
      </div>
    </form>
  );
}
