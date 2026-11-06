import { listRegistryModels } from "@/server/admin/agents";

export const metadata = { title: "Model Registry" };
export const dynamic = "force-dynamic";

export default async function AdminModelsPage() {
  const models = await listRegistryModels();
  return (
    <div className="mx-auto max-w-[850px] space-y-5">
      <h1 className="text-[18px] font-semibold md:text-[20px]">Model registry</h1>
      <p className="text-[13px] leading-5 text-muted-foreground">Model YupiAI akan disinkronkan dan diverifikasi melalui OpenAI-compatible gateway pada Phase 1.4. Tidak ada model Anthropic atau ID model buatan.</p>
      <div className="divide-y divide-border border-t border-border">
        {models.map(model => (
          <div key={model.id} className="flex items-start justify-between gap-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-[14px] font-medium">{model.displayName}</p>
              <p className="break-all font-mono text-[12px] text-muted-foreground">{model.gatewayModelId}</p>
              <p className="mt-1 text-[12px] text-muted-foreground">{model.family} · {model.category}</p>
            </div>
            <span className="shrink-0 text-[12px] text-muted-foreground">{model.enabled ? model.availability : "disabled"}</span>
          </div>
        ))}
        {!models.length && <p className="py-8 text-[14px] text-muted-foreground">Registry masih kosong. Selesaikan Phase 1.4 untuk memilih model setiap agent.</p>}
      </div>
    </div>
  );
}
