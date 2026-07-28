export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getDb, logActivity } from "@/lib/db";
import { requireRole, ROLE_ADMIN, ROLE_EDITOR , requireSection } from "@/lib/auth";
import { selectedBranchId } from "@/lib/branch";

export async function GET() {
  const s = await requireSection("menu");
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getDb();
  const branchId = await selectedBranchId();
  const items = await db.prepare(
    "SELECT * FROM MenuItems WHERE BranchId=$1 ORDER BY CategoryId, DisplayOrder"
  ).all(branchId);
  return NextResponse.json({ items });
}
export async function POST(req) {
  const s = await requireSection("menu");
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const b = await req.json();
  if (!b.Name?.trim() || !b.CategoryId || b.Price == null || isNaN(parseFloat(b.Price)))
    return NextResponse.json({ error: "Name, category and a valid price are required." }, { status: 400 });
  const db = await getDb();
  const branchId = await selectedBranchId();
  let r;
  try {
    r = await db.prepare(`INSERT INTO MenuItems (CategoryId,Name,Description,Price,ImageUrl,IsAvailable,IsActive,DisplayOrder,IsFeatured,SideOptions,SideLimit,BranchId)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING MenuItemId AS id`).run(b.CategoryId, b.Name.trim(), b.Description || null, parseFloat(b.Price), b.ImageUrl || null, b.IsAvailable ? true : false, b.IsActive ? true : false, b.DisplayOrder || 0, b.IsFeatured ? true : false, (b.SideOptions || "").trim() || null, parseInt(b.SideLimit, 10) || 0, branchId);
  } catch (err) {
    if (/sideoptions|sidelimit/i.test(err.message)) {
      r = await db.prepare(`INSERT INTO MenuItems (CategoryId,Name,Description,Price,ImageUrl,IsAvailable,IsActive,DisplayOrder,IsFeatured,BranchId)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING MenuItemId AS id`).run(b.CategoryId, b.Name.trim(), b.Description || null, parseFloat(b.Price), b.ImageUrl || null, b.IsAvailable ? true : false, b.IsActive ? true : false, b.DisplayOrder || 0, b.IsFeatured ? true : false, branchId);
    } else {
      console.error("[items POST] insert failed:", err.message);
      return NextResponse.json({ error: "Could not save: " + err.message }, { status: 500 });
    }
  }
  await logActivity(Number(s.sub), "ITEM_CREATE", b.Name);
  return NextResponse.json({ ok: true, id: r.lastInsertRowid });
}
