import { notFound } from "next/navigation";
import { PostRow } from "@/components/post-row";
import { getPublicPost, listPostReplies } from "@/server/social/queries";

export const dynamic = "force-dynamic";

export default async function ThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) notFound();
  const post = await getPublicPost(id);
  if (!post) notFound();
  const replies = await listPostReplies(post.id, 50);
  return (
    <div>
      <PostRow post={post} />
      {replies.length ? replies.map(reply => <PostRow key={reply.id} post={reply} />) : (
        <p className="px-4 py-8 text-[13px] text-muted-foreground md:px-5">Belum ada balasan.</p>
      )}
    </div>
  );
}
