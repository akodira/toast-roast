export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { generatePin, hashPin } from "@/lib/pin";

// Public: claim a free table. Atomic conditional UPDATE (only succeeds if
// still unoccupied) so two people tapping "claim" on the same table at the
// same moment can't both win.
//
// On success we generate a fresh 4-digit table PIN, store only its hash, and
// return the plaintext ONCE — this response is the single moment the PIN is
// ever visible. The customer notes it (or saves the popup); anyone joining
// the table or ordering to it later must supply it.
export async function POST(req) {
  const { tableId, phone, name } = await req.json().catch(() => ({}));
  if (!tableId || !phone?.trim() || !name?.trim())
    return NextResponse.json({ error: "Table, phone number and name are all required." }, { status: 400 });
  if (!/^[\d+\-\s()]{7,}$/.test(phone))
    return NextResponse.json({ error: "Please enter a valid phone number." }, { status: 400 });

  const pin = generatePin();
  const pinHash = await hashPin(pin);

  const db = await getDb();
  const r = await db.prepare(`UPDATE Tables
      SET OccupiedBy=$1, OccupiedName=$2, OccupiedAt=NOW(),
          PinHash=$3, PinAttempts=0, PinLockedUntil=NULL
    WHERE TableId=$4 AND IsActive=true AND OccupiedBy IS NULL`)
    .run(phone.trim(), name.trim(), pinHash, tableId);
  if (!r.changes) return NextResponse.json({ error: "That table was just taken — please pick another." }, { status: 409 });

  // Return the plaintext PIN exactly once. It is never retrievable again.
  return NextResponse.json({ ok: true, pin });
}
