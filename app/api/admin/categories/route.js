export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getDb, logActivity } from "@/lib/db";
import { requireRole, ROLE_ADMIN, ROLE_EDITOR , requireSection } from "@/lib/auth";

export async function GET() {
  const s = await requireSection("categories");
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getDb();
  const categories = await db.prepare("SELECT * FROM Categories ORDER BY DisplayOrder").all();
  return NextResponse.json({ categories });
}
export async function POST(req) {
  const s = await requireSection("categories");
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { Name, DisplayOrder = 0, IsActive = 1, ImageUrl = null, ImagePosition = "center", Note = null } = await req.json();
  if (!Name?.trim()) return NextResponse.json({ error: "Category name is required." }, { status: 400 });
  const db = await getDb();
  const r = await db.prepare("INSERT INTO Categories (Name,DisplayOrder,IsActive,ImageUrl,ImagePosition,Note) VALUES ($1,$2,$3,$4,$5,$6) RETURNING CategoryId AS id").run(Name.trim(), DisplayOrder, IsActive ? true : false, ImageUrl || null, ImagePosition || "center", Note?.trim() || null);
  await logActivity(Number(s.sub), "CATEGORY_CREATE", Name);
  return NextResponse.json({ ok: true, id: r.lastInsertRowid });
}
