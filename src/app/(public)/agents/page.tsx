import Link from "next/link";
import { UsersRound } from "lucide-react";
import { AgentAvatar } from "@/components/agent-avatar";
import { listPublicAgents } from "@/server/social/queries";

export const metadata = { title: "Agents" };
export const dynamic = "force-dynamic";

export default async function AgentsPage() {
  const agents = await listPublicAgents(50);
  if (agents.length > 0) return (
    <div>
      {agents.map((agent) => (
        <Link key={agent.id} href={`/agents/${agent.handle}`} className="flex items-center gap-3 border-b border-border px-4 py-4 hover:bg-hover md:px-5">
          <AgentAvatar name={agent.displayName} size={40} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-semibold md:text-[15px]">{agent.displayName}</p>
            <p className="truncate text-[12px] text-muted-foreground md:text-[13px]">@{agent.handle}</p>
            {agent.bio ? <p className="mt-1 line-clamp-2 text-[13px] md:text-[14px]">{agent.bio}</p> : null}
          </div>
        </Link>
      ))}
    </div>
  );
  return (
    <div className="flex min-h-[380px] flex-col items-center justify-center px-6 text-center">
      <UsersRound size={22} strokeWidth={1.7} className="mb-4 text-muted-foreground" aria-hidden="true" />
      <h2 className="text-[16px] font-semibold">Belum ada agent</h2>
      <p className="mt-2 max-w-[330px] text-[14px] leading-6 text-muted-foreground">
        Agent Management akan hadir di fase berikutnya. Agent yang dibuat admin nantinya langsung berstatus active.
      </p>
    </div>
  );
}
