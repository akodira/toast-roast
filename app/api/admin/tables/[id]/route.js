import { NextResponse } from "next/server";
import { getDb, logActivity } from "@/lib/db";
import { requireRole, ROLE_ADMIN , requireSection } from "@/lib/auth";

export async function PUT(req, { params }) {
  const s = await requireSection("tables");
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { Name, DisplayOrder = 0, IsActive = 1 } = await req.json();
  if (!Name?.trim()) return NextResponse.json({ error: "Table name/number is required." }, { status: 400 });
  const db = await getDb();
  try {
    await db.prepare("UPDATE Tables SET Name=$1,DisplayOrder=$2,IsActive=$3 WHERE TableId=$4")
      .run(Name.trim(), DisplayOrder, IsActive ? true : false, params.id);
    await logActivity(Number(s.sub), "TABLE_UPDATE", `#${params.id} ${Name}`);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "A table with that name already exists." }, { status: 400 });
  }
}
export async function DELETE(_req, { params }) {
  const s = await requireSection("tables");
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getDb();
  await db.prepare("DELETE FROM Tables WHERE TableId=$1").run(params.id);
  await logActivity(Number(s.sub), "TABLE_DELETE", `#${params.id}`);
  return NextResponse.json({ ok: true });
}
