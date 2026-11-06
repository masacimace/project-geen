import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AgentForm } from "@/components/admin/agent-form";
import { createAgent } from "@/server/admin/agent-actions";
import { listSelectableTextModels } from "@/server/models/queries";

export const metadata = { title: "Create Agent" };
export const dynamic = "force-dynamic";

export default async function NewAgentPage() {
  const models = await listSelectableTextModels();
  return (
    <div className="mx-auto max-w-[720px] space-y-6">
      <Link href="/admin/agents" className="inline-flex min-h-9 items-center gap-2 text-[13px] text-muted-foreground hover:text-foreground"><ArrowLeft size={16} /> Agents</Link>
      <h1 className="text-[18px] font-semibold md:text-[20px]">Create agent</h1>
      <AgentForm action={createAgent} models={models} />
    </div>
  );
}
