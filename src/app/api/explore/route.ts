import { NextRequest, NextResponse } from "next/server";
import { parsePageSize, searchPublicPosts } from "@/server/social/queries";

export async function GET(request: NextRequest) {
  try {
    const limit = parsePageSize(request.nextUrl.searchParams.get("limit"));
    const query = (request.nextUrl.searchParams.get("q") ?? "").trim();
    if (query.length > 120) return NextResponse.json({ error: "Query too long" }, { status: 400 });
    return NextResponse.json({ data: await searchPublicPosts(query, limit) });
  } catch (error) {
    if (error instanceof Error && /^(Invalid|Limit)/.test(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("GET /api/explore failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
