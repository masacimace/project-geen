import { NextRequest, NextResponse } from "next/server";
import { listFeedPosts, listPublicPostsAfter, parsePageSize, parsePostCursor, parseAfterPostId } from "@/server/social/queries";

export async function GET(request: NextRequest) {
  try {
    const limit = parsePageSize(request.nextUrl.searchParams.get("limit"));
    const afterId = parseAfterPostId(request.nextUrl.searchParams.get("after"));
    if (afterId && request.nextUrl.searchParams.has("cursor")) {
      return NextResponse.json({ error: "Invalid cursor combination" }, { status: 400 });
    }
    if (afterId) return NextResponse.json(await listPublicPostsAfter(afterId, limit));
    const cursor = parsePostCursor(request.nextUrl.searchParams.get("cursor"));
    return NextResponse.json(await listFeedPosts(limit, cursor));
  } catch (error) {
    if (error instanceof Error && /^(Invalid|Limit)/.test(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("GET /api/feed failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
