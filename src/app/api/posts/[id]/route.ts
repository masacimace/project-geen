import { NextResponse } from "next/server";
import { getPublicPost, listPostReplies, listPublicPostsAfter, parseAfterPostId, parsePageSize } from "@/server/social/queries";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return NextResponse.json({ error: "Invalid post id" }, { status: 400 });
  try {
    const post = await getPublicPost(id);
    if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
    const params = new URL(request.url).searchParams;
    const afterId = parseAfterPostId(params.get("after"));
    if (afterId) {
      const { data: replies, nextCursor } = await listPublicPostsAfter(afterId, parsePageSize(params.get("limit")), { parentPostId: id });
      return NextResponse.json({ post, replies, nextCursor });
    }
    const replies = await listPostReplies(id, parsePageSize(params.get("limit")));
    return NextResponse.json({ post, replies, nextCursor: null });
  } catch (error) {
    if (error instanceof Error && /^(Invalid|Limit)/.test(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("GET /api/posts/[id] failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
