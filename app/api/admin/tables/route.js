export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getDb, logActivity } from "@/lib/db";
import { requireRole, ROLE_ADMIN, ROLE_STAFF, ROLE_MANAGER , requireSection } from "@/lib/auth";
import { selectedBranchId } from "@/lib/branch";

export async function GET() {
  const s = await requireSection("tables");
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getDb();
  const branchId = await selectedBranchId();
  const rows = await db.prepare("SELECT * FROM Tables WHERE BranchId=$1 ORDER BY DisplayOrder").all(branchId);
  // Never send the PIN hash to the browser. Expose only whether a PIN is set.
  const tables = rows.map(({ PinHash, ...t }) => ({ ...t, HasPin: !!PinHash }));
  return NextResponse.json({ tables });
}
export async function POST(req) {
  const s = await requireSection("tables");
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { Name, DisplayOrder = 0, IsActive = 1 } = await req.json();
  if (!Name?.trim()) return NextResponse.json({ error: "Table name/number is required." }, { status: 400 });
  const db = await getDb();
  const branchId = await selectedBranchId();
  try {
    const r = await db.prepare("INSERT INTO Tables (Name,DisplayOrder,IsActive,BranchId) VALUES ($1,$2,$3,$4) RETURNING TableId AS id")
      .run(Name.trim(), DisplayOrder, IsActive ? true : false, branchId);
    await logActivity(Number(s.sub), "TABLE_CREATE", Name);
    return NextResponse.json({ ok: true, id: r.lastInsertRowid });
  } catch {
    return NextResponse.json({ error: "This branch already has a table with that name." }, { status: 400 });
  }
}
