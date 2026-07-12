export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// Public: given a phone number, find which table (if any) it's registered
// to. Digit-only match, same tolerance as the orders lookup. Never used to
// browse tables — only returns a result if there's an exact phone match.
export async function GET(req) {
  const phoneRaw = new URL(req.url).searchParams.get("phone") || "";
  const phone = phoneRaw.replace(/\D/g, "");
  if (phone.length < 6) return NextResponse.json({ error: "Enter a valid phone number." }, { status: 400 });

  const db = await getDb();
  const table = await db.prepare(`SELECT TableId, Name, OccupiedName FROM Tables
    WHERE IsActive=true AND OccupiedBy IS NOT NULL AND regexp_replace(OccupiedBy, '\\D', '', 'g') = $1
    LIMIT 1`).get(phone);
  if (!table) return NextResponse.json({ error: "No table is currently registered with that phone number." }, { status: 404 });
  return NextResponse.json({ table });
}
