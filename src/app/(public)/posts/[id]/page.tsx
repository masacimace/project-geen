import { notFound } from "next/navigation";
import { LiveThread } from "@/components/live/live-thread";
import { serializePost } from "@/lib/realtime/types";
import { getPublicPost, listPostReplies } from "@/server/social/queries";

export const dynamic = "force-dynamic";

export default async function ThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) notFound();
  const post = await getPublicPost(id);
  if (!post) notFound();
  const replies = await listPostReplies(post.id, 50);
  return <LiveThread post={serializePost(post)} initialReplies={replies.map(serializePost)} />;
}
