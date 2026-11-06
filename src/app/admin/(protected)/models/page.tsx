import Link from "next/link";
import { isYupiAIConfigured } from "@/server/ai/yupiai-client";
import { listRegistryModels } from "@/server/admin/agents";
import { syncModelsAction, toggleModelAction, verifyModelAction } from "@/server/admin/model-actions";
import { getModelRegistryStats } from "@/server/models/sync";

export const metadata = { title: "Model Registry" };
export const dynamic = "force-dynamic";

type Params = { notice?: string; error?: string; q?: string; filter?: string };
export default async function AdminModelsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const [allModels, stats] = await Promise.all([listRegistryModels(), getModelRegistryStats()]);
  const search = (params.q ?? "").trim().toLowerCase().slice(0, 80);
  const filter = params.filter ?? "all";
  const models = allModels.filter(model => {
    if (search && !`${model.displayName} ${model.gatewayModelId} ${model.family}`.toLowerCase().includes(search)) return false;
    if (filter === "enabled") return model.enabled && model.availability === "available";
    if (filter === "pending") return !model.openaiCompatible && model.availability === "available";
    if (filter === "unavailable") return model.availability === "unavailable";
    return true;
  });
  const ready = isYupiAIConfigured();

  return (
    <div className="mx-auto max-w-[920px] space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[18px] font-semibold md:text-[20px]">Model registry</h1>
        <form action={syncModelsAction}>
          <button type="submit" disabled={!ready} className="min-h-10 rounded-md border border-border px-3 text-[13px] font-medium hover:bg-hover disabled:cursor-not-allowed disabled:opacity-40">Sync from YupiAI</button>
        </form>
      </div>
      <p className="text-[13px] leading-5 text-muted-foreground">Hanya model text non-Anthropic via OpenAI-compatible gateway. Sync katalog tidak menjalankan inference; verifikasi tiap model memakai satu request berbayar dan mengaktifkan model jika berhasil.</p>
      {!ready && <p role="alert" className="border-l-2 border-border pl-3 text-[13px] text-muted-foreground">Isi YUPIAI_API_KEY dan YUPIAI_BASE_URL di .env.local, kemudian restart Next.js.</p>}
      {params.notice && <p role="status" className="rounded-md border border-border px-3 py-2 text-[13px]">{params.notice.slice(0, 250)}</p>}
      {params.error && <p role="alert" className="rounded-md border border-destructive px-3 py-2 text-[13px] text-destructive">{params.error.slice(0, 250)}</p>}
      <dl className="grid grid-cols-2 gap-4 border-y border-border py-4 sm:grid-cols-4">
        {[["Catalog", stats.all], ["Verified", stats.verified], ["Enabled", stats.eligible], ["Unavailable", stats.unavailable]].map(([label, count]) => (
          <div key={label} className="space-y-1"><dt className="text-[12px] text-muted-foreground">{label}</dt><dd className="text-[19px] font-semibold tabular-nums">{count}</dd></div>
        ))}
      </dl>
      <form action="/admin/models" className="flex flex-wrap gap-2">
        <input type="search" name="q" aria-label="Search models" placeholder="Search model ID or name" defaultValue={params.q ?? ""} maxLength={80} className="min-h-10 min-w-0 flex-1 rounded-md border border-border bg-background px-3 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-ring"/>
        <select name="filter" aria-label="Filter models" defaultValue={filter} className="min-h-10 rounded-md border border-border bg-background px-2 text-[13px]">
          <option value="all">All</option><option value="pending">Pending</option><option value="enabled">Enabled</option><option value="unavailable">Unavailable</option>
        </select>
        <button type="submit" className="min-h-10 rounded-md border border-border px-3 text-[13px] hover:bg-hover">Filter</button>
      </form>
      <div className="divide-y divide-border border-t border-border">
        {models.map(model => {
          const eligible = model.openaiCompatible && model.availability === "available";
          const verifiedAt = typeof model.capabilities?.verifiedAt === "string" ? model.capabilities.verifiedAt : null;
          return (
            <div key={model.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 space-y-1">
                <p className="break-words text-[14px] font-medium">{model.displayName}</p>
                <p className="break-all font-mono text-[12px] text-muted-foreground">{model.gatewayModelId}</p>
                <p className="text-[12px] text-muted-foreground">{model.family} · {model.availability} · {model.enabled ? "enabled" : model.openaiCompatible ? "verified / disabled" : "not verified"}</p>
                {verifiedAt && <p className="text-[12px] text-muted-foreground">Verified {new Date(verifiedAt).toLocaleString("id-ID")}</p>}
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                {model.availability === "available" && !model.openaiCompatible && (
                  <form action={verifyModelAction.bind(null, model.id)}>
                    <button type="submit" disabled={!ready} title="This makes one paid YupiAI completion request" className="min-h-9 rounded-md border border-border px-3 text-[12px] font-medium hover:bg-hover disabled:opacity-40">Verify (paid)</button>
                  </form>
                )}
                {eligible && (
                  <form action={toggleModelAction.bind(null, model.id, !model.enabled)}>
                    <button type="submit" className="min-h-9 rounded-md border border-border px-3 text-[12px] font-medium hover:bg-hover">{model.enabled ? "Disable" : "Enable"}</button>
                  </form>
                )}
              </div>
            </div>
          );
        })}
        {!models.length && <p className="py-8 text-[13px] text-muted-foreground">Tidak ada model untuk filter ini. Coba sinkronisasi katalog YupiAI.</p>}
      </div>
      <p className="text-[12px] leading-5 text-muted-foreground">Sinkronisasi mempertahankan model yang sudah diverifikasi dan assignment agent, tetapi model yang tidak lagi ada di katalog ditandai unavailable. <Link href="/admin/usage" className="underline underline-offset-4">Lihat penggunaan</Link>.</p>
    </div>
  );
}
