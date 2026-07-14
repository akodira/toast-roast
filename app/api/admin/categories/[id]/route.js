import { NextResponse } from "next/server";
import { getDb, logActivity } from "@/lib/db";
import { requireRole, ROLE_ADMIN, ROLE_EDITOR } from "@/lib/auth";

export async function PUT(req, { params }) {
  const s = await requireRole([ROLE_ADMIN, ROLE_EDITOR]);
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { Name, DisplayOrder = 0, IsActive = 1, ImageUrl = null, ImagePosition = "center", Note = null } = await req.json();
  if (!Name?.trim()) return NextResponse.json({ error: "Category name is required." }, { status: 400 });
  const db = await getDb();
  await db.prepare("UPDATE Categories SET Name=$1,DisplayOrder=$2,IsActive=$3,ImageUrl=$4,ImagePosition=$5,Note=$6 WHERE CategoryId=$7").run(Name.trim(), DisplayOrder, IsActive ? true : false, ImageUrl || null, ImagePosition || "center", Note?.trim() || null, params.id);
  await logActivity(Number(s.sub), "CATEGORY_UPDATE", `#${params.id} ${Name}`);
  return NextResponse.json({ ok: true });
}
export async function DELETE(_req, { params }) {
  const s = await requireRole([ROLE_ADMIN, ROLE_EDITOR]);
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getDb();
  await db.prepare("DELETE FROM Categories WHERE CategoryId=$1").run(params.id);
  await logActivity(Number(s.sub), "CATEGORY_DELETE", `#${params.id}`);
  return NextResponse.json({ ok: true });
}
