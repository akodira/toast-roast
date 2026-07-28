export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { BRANCH_COOKIE, selectedBranchId } from "@/lib/branch";

// Available to any signed-in admin (not gated to the "branches" section) —
// everyone needs to switch which branch they're working in. Returns the branch
// list plus the currently-selected id.
export async function GET() {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getDb();
  const branches = await db.prepare(
    "SELECT BranchId, Name, IsActive FROM Branches ORDER BY DisplayOrder, BranchId"
  ).all();
  const current = await selectedBranchId();
  return NextResponse.json({
    branches: branches.map(b => ({ BranchId: b.BranchId, Name: b.Name, IsActive: !!b.IsActive })),
    current,
  });
}

// Switch the working branch — stores the choice in a cookie the server reads
// when scoping menu/categories/tables.
export async function POST(req) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { branchId } = await req.json().catch(() => ({}));
  const db = await getDb();
  const hit = await db.prepare("SELECT BranchId FROM Branches WHERE BranchId=$1").get(branchId);
  if (!hit) return NextResponse.json({ error: "Unknown branch." }, { status: 400 });
  cookies().set(BRANCH_COOKIE, String(hit.BranchId), { httpOnly: false, sameSite: "lax", path: "/" });
  return NextResponse.json({ ok: true, current: hit.BranchId });
}
