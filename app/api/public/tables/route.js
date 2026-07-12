export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// Public: list active tables with occupancy status. Never expose the phone
// number that occupies a table — only whether it's occupied and (optionally)
// the name given at registration, so a joiner can confirm "yes, that's us."
export async function GET() {
  const db = await getDb();
  const tables = await db.prepare("SELECT * FROM Tables WHERE IsActive=true ORDER BY DisplayOrder").all();
  return NextResponse.json({
    tables: tables.map(t => ({
      TableId: t.TableId,
      Name: t.Name,
      Occupied: !!t.OccupiedBy,
      OccupiedName: t.OccupiedName || null,
    })),
  });
}
