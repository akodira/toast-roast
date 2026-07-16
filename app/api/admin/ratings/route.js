export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireRole, ROLE_ADMIN, ROLE_MANAGER , requireSection } from "@/lib/auth";

export async function GET() {
  if (!(await requireSection("dashboard"))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getDb();
  const rows = await db.prepare("SELECT * FROM Ratings ORDER BY CreatedAt DESC LIMIT 100").all();
  const summary = await db.prepare("SELECT COUNT(*) c, COALESCE(AVG(Score),0) avg FROM Ratings").get();
  return NextResponse.json({
    ratings: rows,
    count: Number(summary.c),
    average: Number(summary.avg),
  });
}
