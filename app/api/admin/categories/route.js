export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getDb, logActivity } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const db = await getDb();
  const categories = await db.prepare("SELECT * FROM Categories ORDER BY DisplayOrder").all();
  return NextResponse.json({ categories });
}
export async function POST(req) {
  const s = await getSession();
  const { Name, DisplayOrder = 0, IsActive = 1, ImageUrl = null, ImagePosition = "center" } = await req.json();
  if (!Name?.trim()) return NextResponse.json({ error: "Category name is required." }, { status: 400 });
  const db = await getDb();
  const r = await db.prepare("INSERT INTO Categories (Name,DisplayOrder,IsActive,ImageUrl,ImagePosition) VALUES ($1,$2,$3,$4,$5) RETURNING CategoryId AS id").run(Name.trim(), DisplayOrder, IsActive ? true : false, ImageUrl || null, ImagePosition || "center");
  await logActivity(Number(s.sub), "CATEGORY_CREATE", Name);
  return NextResponse.json({ ok: true, id: r.lastInsertRowid });
}
