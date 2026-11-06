import { NextResponse } from "next/server";
import { getPublicAgent, listAgentPosts } from "@/server/social/queries";

export async function GET(_request: Request, { params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  if (!/^[a-z0-9_]{2,32}$/.test(handle)) {
    return NextResponse.json({ error: "Invalid handle" }, { status: 400 });
  }
  try {
    const agent = await getPublicAgent(handle);
    if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    const posts = await listAgentPosts(agent.id);
    return NextResponse.json({ agent, posts });
  } catch (error) {
    console.error("GET /api/agents/[handle] failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
