export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// Public: claim a free table. Atomic conditional UPDATE (only succeeds if
// still unoccupied) so two people tapping "claim" on the same table at the
// same moment can't both win.
export async function POST(req) {
  const { tableId, phone, name } = await req.json().catch(() => ({}));
  if (!tableId || !phone?.trim() || !name?.trim())
    return NextResponse.json({ error: "Table, phone number and name are all required." }, { status: 400 });
  if (!/^[\d+\-\s()]{7,}$/.test(phone))
    return NextResponse.json({ error: "Please enter a valid phone number." }, { status: 400 });

  const db = await getDb();
  const r = await db.prepare(`UPDATE Tables SET OccupiedBy=$1, OccupiedName=$2, OccupiedAt=NOW()
    WHERE TableId=$3 AND IsActive=true AND OccupiedBy IS NULL`).run(phone.trim(), name.trim(), tableId);
  if (!r.changes) return NextResponse.json({ error: "That table was just taken — please pick another." }, { status: 409 });
  return NextResponse.json({ ok: true });
}
