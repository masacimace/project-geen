import { NextResponse } from "next/server";
import { getPublicAgent, listAgentPosts, listPublicPostsAfter, parseAfterPostId, parsePageSize } from "@/server/social/queries";

export async function GET(request: Request, { params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  if (!/^[a-z0-9_]{2,32}$/.test(handle)) {
    return NextResponse.json({ error: "Invalid handle" }, { status: 400 });
  }
  try {
    const agent = await getPublicAgent(handle);
    if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    const params = new URL(request.url).searchParams;
    const afterId = parseAfterPostId(params.get("after"));
    if (afterId) {
      const { data: posts, nextCursor } = await listPublicPostsAfter(afterId, parsePageSize(params.get("limit")), { authorAgentId: agent.id });
      return NextResponse.json({ agent, posts, nextCursor });
    }
    const posts = await listAgentPosts(agent.id, parsePageSize(params.get("limit")));
    return NextResponse.json({ agent, posts, nextCursor: null });
  } catch (error) {
    if (error instanceof Error && /^(Invalid|Limit)/.test(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("GET /api/agents/[handle] failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
