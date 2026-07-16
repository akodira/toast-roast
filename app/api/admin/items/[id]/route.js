import { NextResponse } from "next/server";
import { getDb, logActivity } from "@/lib/db";
import { requireRole, ROLE_ADMIN, ROLE_EDITOR , requireSection } from "@/lib/auth";

export async function PUT(req, { params }) {
  const s = await requireSection("menu");
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const b = await req.json();
  if (!b.Name?.trim() || !b.CategoryId || b.Price == null || isNaN(parseFloat(b.Price)))
    return NextResponse.json({ error: "Name, category and a valid price are required." }, { status: 400 });
  const db = await getDb();
  try {
    await db.prepare(`UPDATE MenuItems SET CategoryId=$1,Name=$2,Description=$3,Price=$4,ImageUrl=$5,IsAvailable=$6,IsActive=$7,DisplayOrder=$8,IsFeatured=$9,SideOptions=$10,SideLimit=$11 WHERE MenuItemId=$12`)
      .run(b.CategoryId, b.Name.trim(), b.Description || null, parseFloat(b.Price), b.ImageUrl || null, b.IsAvailable ? true : false, b.IsActive ? true : false, b.DisplayOrder || 0, b.IsFeatured ? true : false, (b.SideOptions || "").trim() || null, parseInt(b.SideLimit, 10) || 0, params.id);
  } catch (err) {
    // If the side columns aren't present yet (migration lag on a partial
    // deploy), fall back to saving everything except the sides so the item
    // still updates instead of the whole save failing.
    if (/sideoptions|sidelimit/i.test(err.message)) {
      await db.prepare(`UPDATE MenuItems SET CategoryId=$1,Name=$2,Description=$3,Price=$4,ImageUrl=$5,IsAvailable=$6,IsActive=$7,DisplayOrder=$8,IsFeatured=$9 WHERE MenuItemId=$10`)
        .run(b.CategoryId, b.Name.trim(), b.Description || null, parseFloat(b.Price), b.ImageUrl || null, b.IsAvailable ? true : false, b.IsActive ? true : false, b.DisplayOrder || 0, b.IsFeatured ? true : false, params.id);
      return NextResponse.json({ ok: true, warning: "Saved, but side options need a redeploy to take effect." });
    }
    console.error("[items PUT] update failed:", err.message);
    return NextResponse.json({ error: "Could not save: " + err.message }, { status: 500 });
  }
  await logActivity(Number(s.sub), "ITEM_UPDATE", `#${params.id} ${b.Name}`);
  return NextResponse.json({ ok: true });
}
export async function DELETE(_req, { params }) {
  const s = await requireSection("menu");
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getDb();
  await db.prepare("DELETE FROM MenuItems WHERE MenuItemId=$1").run(params.id);
  await logActivity(Number(s.sub), "ITEM_DELETE", `#${params.id}`);
  return NextResponse.json({ ok: true });
}
