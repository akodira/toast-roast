export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// Public: join a table someone else already registered, by proving you know
// the phone number they registered it with (acts as a shared "table PIN").
// Never reveals the actual phone — only whether the guess matched.
export async function POST(req) {
  const { tableId, phone, name } = await req.json().catch(() => ({}));
  if (!tableId || !phone?.trim() || !name?.trim())
    return NextResponse.json({ error: "Table, phone number and name are all required." }, { status: 400 });

  const db = await getDb();
  const table = await db.prepare("SELECT OccupiedBy FROM Tables WHERE TableId=$1 AND IsActive=true").get(tableId);
  if (!table || !table.OccupiedBy) return NextResponse.json({ error: "That table isn't currently registered by anyone." }, { status: 400 });
  if (table.OccupiedBy.trim() !== phone.trim())
    return NextResponse.json({ error: "Incorrect phone number for this table." }, { status: 403 });
  return NextResponse.json({ ok: true });
}
