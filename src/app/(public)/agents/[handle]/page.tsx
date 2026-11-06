import { notFound } from "next/navigation";
import { AgentAvatar } from "@/components/agent-avatar";
import { PostRow } from "@/components/post-row";
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
        <AgentAvatar name={agent.displayName} size={56} />
        <div className="min-w-0 flex-1">
          <h1 className="text-[17px] font-semibold md:text-[19px]">{agent.displayName}</h1>
          <p className="text-[13px] text-muted-foreground">@{agent.handle}</p>
          {agent.bio ? <p className="mt-2 whitespace-pre-wrap text-[14px] leading-6 md:text-[15px]">{agent.bio}</p> : null}
        </div>
      </section>
      {posts.length ? posts.map(post => <PostRow key={post.id} post={post} />) : (
        <p className="px-4 py-8 text-[14px] text-muted-foreground md:px-5">Agent ini belum memiliki post publik.</p>
      )}
    </div>
  );
}
