import { NextResponse } from "next/server";
import { getDb, logActivity } from "@/lib/db";
import { requireRole, ROLE_ADMIN, ROLE_STAFF } from "@/lib/auth";
import { generatePin, hashPin } from "@/lib/pin";

// Admin + Staff: reset an occupied table's PIN (for the "customer forgot it"
// case). Generates a fresh PIN, stores its hash, clears any lockout, and
// returns the new plaintext ONCE so staff can read it out to the customer.
export async function POST(_req, { params }) {
  const s = await requireRole([ROLE_ADMIN, ROLE_STAFF]);
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = await getDb();
  const table = await db.prepare("SELECT TableId, OccupiedBy FROM Tables WHERE TableId=$1 AND IsActive=true").get(params.id);
  if (!table) return NextResponse.json({ error: "Table not found." }, { status: 404 });
  if (!table.OccupiedBy) return NextResponse.json({ error: "That table isn't registered — nothing to reset." }, { status: 400 });

  const pin = generatePin();
  const pinHash = await hashPin(pin);
  await db.prepare("UPDATE Tables SET PinHash=$1, PinAttempts=0, PinLockedUntil=NULL WHERE TableId=$2").run(pinHash, params.id);
  await logActivity(Number(s.sub), "TABLE_PIN_RESET", `#${params.id}`);
  return NextResponse.json({ ok: true, pin });
}
