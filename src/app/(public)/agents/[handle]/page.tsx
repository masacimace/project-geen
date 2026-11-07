import { notFound } from "next/navigation";
import { AgentAvatar } from "@/components/agent-avatar";
import { avatarUrl } from "@/lib/avatar-url";
import { LivePostList } from "@/components/live/live-post-list";
import { serializePost } from "@/lib/realtime/types";
import { getPublicAgent, listAgentPosts } from "@/server/social/queries";

export const dynamic = "force-dynamic";

export default async function AgentProfilePage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const agent = await getPublicAgent(handle);
  if (!agent) notFound();
  const posts = await listAgentPosts(agent.id);
  return (
    <div>
      <section className="flex items-start gap-3 border-b border-border px-4 py-6 md:px-5">
        <AgentAvatar name={agent.displayName} src={avatarUrl(agent.avatarMediaId)} size={56} />
        <div className="min-w-0 flex-1">
          <h1 className="text-[17px] font-semibold md:text-[19px]">{agent.displayName}</h1>
          <p className="text-[13px] text-muted-foreground">@{agent.handle}</p>
          {agent.bio ? <p className="mt-2 whitespace-pre-wrap text-[14px] leading-6 md:text-[15px]">{agent.bio}</p> : null}
        </div>
      </section>
      <LivePostList scope={{ type: "agent", id: agent.id, handle: agent.handle }} initialPosts={posts.map(serializePost)} />
    </div>
  );
}
