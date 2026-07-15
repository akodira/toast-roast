import { NextResponse } from "next/server";
import { getDb, logActivity } from "@/lib/db";
import { requireRole, ROLE_ADMIN, ROLE_STAFF, ROLE_MANAGER } from "@/lib/auth";

// Admin + Staff: mark a table free again once the party has left.
export async function POST(_req, { params }) {
  const s = await requireRole([ROLE_ADMIN, ROLE_STAFF, ROLE_MANAGER]);
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getDb();
  await db.prepare("UPDATE Tables SET OccupiedBy=NULL, OccupiedName=NULL, OccupiedAt=NULL, PinHash=NULL, PinAttempts=0, PinLockedUntil=NULL WHERE TableId=$1").run(params.id);
  await logActivity(Number(s.sub), "TABLE_RELEASE", `#${params.id}`);
  return NextResponse.json({ ok: true });
}
