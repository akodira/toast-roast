export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { PHONE_KEY_SQL, phoneKey } from "@/lib/phone";

// Privacy-preserving lookup for the ordering flow. Given a mobile, tells the
// client whether it's a returning customer and returns a MASKED hint of the
// name (e.g. "Ah••• K•••") — never the full name. The real customer recognizes
// their own masked name and confirms; a stranger typing random numbers gets
// almost nothing. The full name is only revealed after the client confirms
// (see the ?reveal=1 path, which still needs the exact same mobile).
function maskName(name) {
  return String(name || "").trim().split(/\s+/).filter(Boolean)
    .map(w => w[0] + "•••").join(" ");
}

export async function POST(req) {
  const { mobile, reveal } = await req.json().catch(() => ({}));
  const key = phoneKey(mobile || "");
  if (key.length < 7) return NextResponse.json({ known: false });
  const db = await getDb();
  const row = await db.prepare(
    `SELECT Name FROM Customers WHERE ${PHONE_KEY_SQL("Telephone")} = $1 ORDER BY CustomerId DESC LIMIT 1`
  ).get(key);
  if (!row) return NextResponse.json({ known: false });
  // reveal=true returns the full name (used only after the customer taps
  // "That's me" — the confirmation is the consent step).
  return NextResponse.json(reveal ? { known: true, name: row.Name } : { known: true, hint: maskName(row.Name) });
}
