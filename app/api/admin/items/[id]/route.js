import { NextResponse } from "next/server";
import { getDb, logActivity } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function PUT(req, { params }) {
  const s = await getSession();
  const b = await req.json();
  if (!b.Name?.trim() || !b.CategoryId || b.Price == null || isNaN(parseFloat(b.Price)))
    return NextResponse.json({ error: "Name, category and a valid price are required." }, { status: 400 });
  const db = await getDb();
  await db.prepare(`UPDATE MenuItems SET CategoryId=$1,Name=$2,Description=$3,Price=$4,ImageUrl=$5,IsAvailable=$6,IsActive=$7,DisplayOrder=$8 WHERE MenuItemId=$9`)
    .run(b.CategoryId, b.Name.trim(), b.Description || null, parseFloat(b.Price), b.ImageUrl || null, b.IsAvailable ? true : false, b.IsActive ? true : false, b.DisplayOrder || 0, params.id);
  await logActivity(Number(s.sub), "ITEM_UPDATE", `#${params.id} ${b.Name}`);
  return NextResponse.json({ ok: true });
}
export async function DELETE(_req, { params }) {
  const s = await getSession();
  const db = await getDb();
  await db.prepare("DELETE FROM MenuItems WHERE MenuItemId=$1").run(params.id);
  await logActivity(Number(s.sub), "ITEM_DELETE", `#${params.id}`);
  return NextResponse.json({ ok: true });
}
