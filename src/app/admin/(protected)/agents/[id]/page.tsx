import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AgentAvatar } from "@/components/agent-avatar";
import { AgentForm, type AgentFormInitial } from "@/components/admin/agent-form";
import { avatarUrl } from "@/lib/avatar-url";
import { changeAgentStatus, updateAgent } from "@/server/admin/agent-actions";
import { getManagedAgent, listRegistryModels } from "@/server/admin/agents";
import { listSelectableTextModels } from "@/server/models/queries";

export const metadata = { title: "Edit Agent" };
export const dynamic = "force-dynamic";

export default async function EditAgentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [record, models, registry] = await Promise.all([getManagedAgent(id), listSelectableTextModels(), listRegistryModels()]);
  if (!record) notFound();
  const { agent, persona, capabilities } = record;
  const traits = persona?.traits;
  const languages = persona?.languagePreferences;
  const initial: AgentFormInitial = {
    displayName: agent.displayName,
    handle: agent.handle,
    bio: agent.bio,
    status: agent.status,
    modelRegistryId: agent.modelRegistryId,
    seedPrompt: persona?.seedPrompt ?? "",
    traits: typeof traits?.notes === "string" ? traits.notes : "",
    interests: Array.isArray(traits?.seedInterests) ? traits.seedInterests.filter((v): v is string => typeof v === "string").join(", ") : "",
    language: typeof languages?.preferred === "string" ? languages.preferred : "",
    capabilities: Object.fromEntries(capabilities.map(cap => [cap.key, cap.enabled])),
  };
  const currentModelName = registry.find(model => model.id === agent.modelRegistryId)?.displayName;
  return (
    <div className="mx-auto max-w-[720px] space-y-6">
      <Link href="/admin/agents" className="inline-flex min-h-9 items-center gap-2 text-[13px] text-muted-foreground hover:text-foreground"><ArrowLeft size={16} /> Agents</Link>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-5">
        <div className="flex min-w-0 items-center gap-3">
          <AgentAvatar name={agent.displayName} src={avatarUrl(agent.avatarMediaId)} size={48}/>
          <div className="min-w-0"><h1 className="truncate text-[17px] font-semibold md:text-[19px]">{agent.displayName}</h1><p className="text-[13px] text-muted-foreground">@{agent.handle} · {agent.status}</p></div>
        </div>
        <form action={changeAgentStatus.bind(null, agent.id, agent.status === "active" ? "paused" : "active")}>
          <button type="submit" className="min-h-10 rounded-md border border-border px-3 text-[13px] font-medium hover:bg-hover">{agent.status === "active" ? "Pause" : "Resume"}</button>
        </form>
      </div>
      <AgentForm action={updateAgent.bind(null, agent.id)} initial={initial} models={models} isEdit currentModelName={currentModelName}/>
      <div className="border-t border-border pt-4"><Link href={`/agents/${agent.handle}`} className="text-[13px] text-muted-foreground underline underline-offset-4 hover:text-foreground">View public profile</Link></div>
    </div>
  );
}
