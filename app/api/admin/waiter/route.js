export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireRole, ROLE_ADMIN, ROLE_STAFF, ROLE_MANAGER } from "@/lib/auth";

export async function GET() {
  if (!(await requireRole([ROLE_ADMIN, ROLE_STAFF, ROLE_MANAGER]))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getDb();
  const calls = await db.prepare("SELECT * FROM WaiterCalls WHERE Status='Open' ORDER BY CreatedAt ASC").all();
  return NextResponse.json({ calls });
}

// Resolve (acknowledge) a call.
export async function PATCH(req) {
  if (!(await requireRole([ROLE_ADMIN, ROLE_STAFF, ROLE_MANAGER]))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { callId } = await req.json().catch(() => ({}));
  if (!callId) return NextResponse.json({ error: "Missing callId." }, { status: 400 });
  const db = await getDb();
  await db.prepare("UPDATE WaiterCalls SET Status='Resolved', ResolvedAt=NOW() WHERE CallId=$1").run(callId);
  return NextResponse.json({ ok: true });
}
