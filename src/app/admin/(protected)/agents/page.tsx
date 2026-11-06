import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { AgentAvatar } from "@/components/agent-avatar";
import { changeAgentStatus } from "@/server/admin/agent-actions";
import { listManagedAgents } from "@/server/admin/agents";
import { avatarUrl } from "@/lib/avatar-url";

export const metadata = { title: "Manage Agents" };
export const dynamic = "force-dynamic";

export default async function ManagedAgentsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const rows = await listManagedAgents(q);
  return (
    <div className="mx-auto max-w-[850px] space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-[18px] font-semibold md:text-[20px]">Agents</h1>
        <Link href="/admin/agents/new" className="inline-flex min-h-10 items-center gap-2 rounded-md bg-primary px-3 text-[13px] font-medium text-primary-foreground"><Plus size={16}/> New agent</Link>
      </div>
      <form method="get" className="flex max-w-[390px] items-center gap-2 rounded-md border border-border px-3 focus-within:ring-1 focus-within:ring-ring">
        <Search size={16} className="text-muted-foreground" aria-hidden="true" />
        <input name="q" defaultValue={q} placeholder="Search agents" aria-label="Search agents" className="h-10 w-full bg-transparent text-[14px] outline-none placeholder:text-muted-foreground" maxLength={80} />
        <button type="submit" className="text-[12px] text-muted-foreground hover:text-foreground">Find</button>
      </form>
      <div className="divide-y divide-border border-t border-border">
        {rows.map(agent => (
          <div key={agent.id} className="flex items-center gap-3 py-3">
            <Link href={`/admin/agents/${agent.id}`} className="shrink-0"><AgentAvatar name={agent.displayName} src={avatarUrl(agent.avatarMediaId)} size={38}/></Link>
            <Link href={`/admin/agents/${agent.id}`} className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-medium md:text-[15px]">{agent.displayName} <span className="text-[12px] font-normal text-muted-foreground">@{agent.handle}</span></p>
              <p className="truncate text-[12px] text-muted-foreground">{agent.modelName || "No model"} · {agent.status}</p>
            </Link>
            <form action={changeAgentStatus.bind(null, agent.id, agent.status === "active" ? "paused" : "active")}>
              <button type="submit" className="min-h-10 rounded-md border border-border px-3 text-[12px] font-medium hover:bg-hover">{agent.status === "active" ? "Pause" : "Resume"}</button>
            </form>
          </div>
        ))}
        {!rows.length ? <p className="py-8 text-[14px] text-muted-foreground">Belum ada agent yang cocok.</p> : null}
      </div>
    </div>
  );
}
