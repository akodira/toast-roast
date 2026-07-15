export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { checkTablePin } from "@/lib/pin";

// Public: join a table someone already registered, by proving you know the
// table's 4-digit PIN (the per-sitting shared secret shown at claim time).
//
// The PIN replaced the phone number as the secret: phone numbers are printed
// on receipts and easy to guess, a random PIN is not. checkTablePin() also
// enforces lockout after repeated wrong guesses, which is what makes a short
// PIN safe against brute force.
export async function POST(req) {
  const { tableId, phone, name, pin } = await req.json().catch(() => ({}));
  if (!tableId || !phone?.trim() || !name?.trim())
    return NextResponse.json({ error: "Table, phone number and name are all required." }, { status: 400 });

  const db = await getDb();
  const table = await db.prepare("SELECT OccupiedBy FROM Tables WHERE TableId=$1 AND IsActive=true").get(tableId);
  if (!table || !table.OccupiedBy) return NextResponse.json({ error: "That table isn't currently registered by anyone." }, { status: 400 });

  const check = await checkTablePin(db, tableId, pin);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

  return NextResponse.json({ ok: true });
}
