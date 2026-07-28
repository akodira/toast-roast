export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getDb, logActivity } from "@/lib/db";
import { requireRole, ROLE_ADMIN, ROLE_EDITOR , requireSection } from "@/lib/auth";
import { sanitizeHtml } from "@/lib/sanitize";
import { selectedBranchId } from "@/lib/branch";

export async function GET() {
  const s = await requireSection("categories");
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getDb();
  const branchId = await selectedBranchId();
  // Show only the selected branch's categories. Legacy rows with NULL BranchId
  // are treated as belonging to the first branch (already backfilled at Stage 1,
  // but the OR guard keeps things safe if any slipped through).
  const categories = await db.prepare(
    "SELECT * FROM Categories WHERE BranchId=$1 ORDER BY DisplayOrder"
  ).all(branchId);
  return NextResponse.json({ categories });
}
export async function POST(req) {
  const s = await requireSection("categories");
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { Name, DisplayOrder = 0, IsActive = 1, ImageUrl = null, ImagePosition = "center", Note = null } = await req.json();
  if (!Name?.trim()) return NextResponse.json({ error: "Category name is required." }, { status: 400 });
  const db = await getDb();
  const branchId = await selectedBranchId();
  const r = await db.prepare("INSERT INTO Categories (Name,DisplayOrder,IsActive,ImageUrl,ImagePosition,Note,BranchId) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING CategoryId AS id").run(Name.trim(), DisplayOrder, IsActive ? true : false, ImageUrl || null, ImagePosition || "center", sanitizeHtml(Note) || null, branchId);
  await logActivity(Number(s.sub), "CATEGORY_CREATE", Name);
  return NextResponse.json({ ok: true, id: r.lastInsertRowid });
}
