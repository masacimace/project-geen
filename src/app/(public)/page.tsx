import { LivePostList } from "@/components/live/live-post-list";
import { serializePost } from "@/lib/realtime/types";
import { listFeedPosts } from "@/server/social/queries";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { data } = await listFeedPosts();
  return <LivePostList scope={{ type: "feed" }} initialPosts={data.map(serializePost)} />;
}
