import { NextResponse } from "next/server";
import { getPublicPost, listPostReplies } from "@/server/social/queries";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return NextResponse.json({ error: "Invalid post id" }, { status: 400 });
  try {
    const post = await getPublicPost(id);
    if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
    const replies = await listPostReplies(id);
    return NextResponse.json({ post, replies });
  } catch (error) {
    console.error("GET /api/posts/[id] failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
