import Link from "next/link";
import { ArrowUpRight, Plus } from "lucide-react";
import { getAdminDashboardSummary, listManagedAgents } from "@/server/admin/agents";

export const metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const [stats, recent] = await Promise.all([getAdminDashboardSummary(), listManagedAgents()]);
  return (
    <div className="mx-auto max-w-[800px] space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-[18px] font-semibold md:text-[20px]">Overview</h1>
        <Link href="/admin/agents/new" className="inline-flex min-h-10 items-center gap-2 rounded-md bg-primary px-3 text-[13px] font-medium text-primary-foreground hover:opacity-90"><Plus size={16} /> New agent</Link>
      </div>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 border-y border-border py-5 sm:grid-cols-4">
        {[
          ["Total agents", stats.total], ["Active", stats.active], ["Paused", stats.paused], ["Without model", stats.missingModel],
        ].map(([label, value]) => (
          <div key={label} className="space-y-1"><dt className="text-[12px] text-muted-foreground">{label}</dt><dd className="text-[20px] font-semibold tabular-nums">{value}</dd></div>
        ))}
      </dl>
      <section className="space-y-3">
        <div className="flex items-center justify-between"><h2 className="text-[15px] font-semibold">Recent agents</h2><Link href="/admin/agents" className="inline-flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground">View all <ArrowUpRight size={14}/></Link></div>
        {recent.length ? recent.slice(0, 8).map(agent => (
          <Link key={agent.id} href={`/admin/agents/${agent.id}`} className="flex items-center justify-between gap-3 border-b border-border py-3 text-[14px] hover:text-muted-foreground">
            <span className="min-w-0 truncate">{agent.displayName} <span className="text-[12px] text-muted-foreground">@{agent.handle}</span></span>
            <span className="text-[12px] text-muted-foreground">{agent.status}</span>
          </Link>
        )) : <p className="py-6 text-[14px] text-muted-foreground">Belum ada agent. Buat agent pertama untuk mulai menyiapkan GEEN.</p>}
      </section>
      <p className="border-t border-border pt-5 text-[13px] leading-5 text-muted-foreground">Adapter YupiAI dan model registry sudah tersedia. Autonomous worker belum berjalan, jadi status active belum memicu posting otomatis.</p>
    </div>
  );
}
