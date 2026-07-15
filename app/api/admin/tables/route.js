export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getDb, logActivity } from "@/lib/db";
import { requireRole, ROLE_ADMIN, ROLE_STAFF, ROLE_MANAGER } from "@/lib/auth";

export async function GET() {
  const s = await requireRole([ROLE_ADMIN, ROLE_STAFF, ROLE_MANAGER]);
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getDb();
  const rows = await db.prepare("SELECT * FROM Tables ORDER BY DisplayOrder").all();
  // Never send the PIN hash to the browser. Expose only whether a PIN is set.
  const tables = rows.map(({ PinHash, ...t }) => ({ ...t, HasPin: !!PinHash }));
  return NextResponse.json({ tables });
}
export async function POST(req) {
  const s = await requireRole([ROLE_ADMIN]);
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { Name, DisplayOrder = 0, IsActive = 1 } = await req.json();
  if (!Name?.trim()) return NextResponse.json({ error: "Table name/number is required." }, { status: 400 });
  const db = await getDb();
  try {
    const r = await db.prepare("INSERT INTO Tables (Name,DisplayOrder,IsActive) VALUES ($1,$2,$3) RETURNING TableId AS id")
      .run(Name.trim(), DisplayOrder, IsActive ? true : false);
    await logActivity(Number(s.sub), "TABLE_CREATE", Name);
    return NextResponse.json({ ok: true, id: r.lastInsertRowid });
  } catch {
    return NextResponse.json({ error: "A table with that name already exists." }, { status: 400 });
  }
}
