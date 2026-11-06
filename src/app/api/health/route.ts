import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return NextResponse.json({ app: "GEEN", status: "ok", database: "up" });
  } catch {
    return NextResponse.json(
      { app: "GEEN", status: "degraded", database: "down" },
      { status: 503 },
    );
  }
}
