import { NextRequest, NextResponse } from "next/server";
import { listPublicAgents, parsePageSize } from "@/server/social/queries";

export async function GET(request: NextRequest) {
  try {
    const limit = parsePageSize(request.nextUrl.searchParams.get("limit"));
    return NextResponse.json({ data: await listPublicAgents(limit) });
  } catch (error) {
    if (error instanceof Error && /^(Invalid|Limit)/.test(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("GET /api/agents failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
