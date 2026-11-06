import { getUsageReport } from "@/server/admin/usage";

export const metadata = { title: "AI Usage" };
export const dynamic = "force-dynamic";

function credits(amount: string | null | undefined) {
  return amount === null || amount === undefined ? "—" : Number(amount).toLocaleString("id-ID", { maximumFractionDigits: 8 });
}

export default async function UsagePage() {
  const { totals, recent, probes } = await getUsageReport();
  return (
    <div className="mx-auto max-w-[920px] space-y-6">
      <h1 className="text-[18px] font-semibold md:text-[20px]">AI usage</h1>
      <dl className="grid grid-cols-2 gap-4 border-y border-border py-5 sm:grid-cols-4">
        {[
          ["Agent requests", totals.requests], ["Success", totals.successes],
          ["Input tokens", totals.tokensIn], ["Output tokens", totals.tokensOut],
        ].map(([label, count]) => (
          <div key={label} className="space-y-1"><dt className="text-[12px] text-muted-foreground">{label}</dt><dd className="text-[19px] font-semibold tabular-nums">{count}</dd></div>
        ))}
      </dl>
      <p className="text-[13px] text-muted-foreground">Total known credits: <strong className="font-medium text-foreground">{credits(totals.knownCostCredits)}</strong> · {totals.missingCost} request(s) tanpa data biaya. Nilai ini bukan saldo kredit live, dan belum termasuk semua verifikasi manual.</p>
      <section className="space-y-3">
        <h2 className="text-[15px] font-semibold">Agent inference</h2>
        <div className="divide-y divide-border border-t border-border">
          {recent.map(item => (
            <div key={item.id} className="grid gap-1 py-3 text-[13px] sm:grid-cols-[minmax(0,1fr)_110px_125px] sm:gap-3">
              <div className="min-w-0"><p className="truncate font-medium">{item.agentName} · {item.modelName}</p><p className="text-[12px] text-muted-foreground">{item.createdAt.toLocaleString("id-ID")} · {item.status}</p></div>
              <p className="text-[12px] text-muted-foreground">{item.tokensIn ?? "—"} in / {item.tokensOut ?? "—"} out</p>
              <p className="text-[12px] text-muted-foreground">{credits(item.costCredits)} credits</p>
            </div>
          ))}
          {!recent.length && <p className="py-6 text-[13px] text-muted-foreground">Belum ada inference agent. Worker otonom belum berjalan.</p>}
        </div>
      </section>
      <section className="space-y-3">
        <h2 className="text-[15px] font-semibold">Manual model verification</h2>
        <div className="divide-y divide-border border-t border-border">
          {probes.map(probe => <div key={probe.id} className="flex flex-wrap justify-between gap-2 py-3 text-[12px]">
            <div className="min-w-0"><p className="break-all font-mono">{String(probe.payload.gatewayModelId ?? "model")}</p><p className="text-muted-foreground">{probe.occurredAt.toLocaleString("id-ID")}</p></div>
            <span className="text-muted-foreground">{credits(typeof probe.payload.costCredits === "string" ? probe.payload.costCredits : null)} credits</span>
          </div>)}
          {!probes.length && <p className="py-6 text-[13px] text-muted-foreground">Belum ada verifikasi model berbayar.</p>}
        </div>
      </section>
    </div>
  );
}
