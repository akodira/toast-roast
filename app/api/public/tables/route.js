export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// Public: list active tables with occupancy status. Never expose the phone
// number that occupies a table — only whether it's occupied and (optionally)
// the name given at registration, so a joiner can confirm "yes, that's us."
export async function GET(req) {
  const db = await getDb();
  const branchId = new URL(req.url).searchParams.get("branch");
  // Scope to a branch when one is supplied (the customer has picked a branch).
  // Without it, fall back to all active tables so older links still work.
  const tables = branchId
    ? await db.prepare("SELECT * FROM Tables WHERE IsActive=true AND BranchId=$1 ORDER BY DisplayOrder").all(branchId)
    : await db.prepare("SELECT * FROM Tables WHERE IsActive=true ORDER BY DisplayOrder").all();
  return NextResponse.json({
    tables: tables.map(t => ({
      TableId: t.TableId,
      Name: t.Name,
      Occupied: !!t.OccupiedBy,
      OccupiedName: t.OccupiedName || null,
      IsReserved: !!t.IsReserved, // shown as a label; the phone stays server-side
    })),
  });
}
