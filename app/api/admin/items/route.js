export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getDb, logActivity } from "@/lib/db";
import { requireRole, ROLE_ADMIN, ROLE_EDITOR , requireSection } from "@/lib/auth";

export async function GET() {
  const s = await requireSection("menu");
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getDb();
  const items = await db.prepare("SELECT * FROM MenuItems ORDER BY CategoryId, DisplayOrder").all();
  return NextResponse.json({ items });
}
export async function POST(req) {
  const s = await requireSection("menu");
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const b = await req.json();
  if (!b.Name?.trim() || !b.CategoryId || b.Price == null || isNaN(parseFloat(b.Price)))
    return NextResponse.json({ error: "Name, category and a valid price are required." }, { status: 400 });
  const db = await getDb();
  const r = await db.prepare(`INSERT INTO MenuItems (CategoryId,Name,Description,Price,ImageUrl,IsAvailable,IsActive,DisplayOrder,IsFeatured,SideOptions)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING MenuItemId AS id`).run(b.CategoryId, b.Name.trim(), b.Description || null, parseFloat(b.Price), b.ImageUrl || null, b.IsAvailable ? true : false, b.IsActive ? true : false, b.DisplayOrder || 0, b.IsFeatured ? true : false, (b.SideOptions || "").trim() || null);
  await logActivity(Number(s.sub), "ITEM_CREATE", b.Name);
  return NextResponse.json({ ok: true, id: r.lastInsertRowid });
}
