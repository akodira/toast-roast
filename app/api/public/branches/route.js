export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// Public list of ACTIVE branches for the customer branch picker. Only exposes
// what a customer needs to choose — id, name, address. Inactive branches are
// hidden so customers can't order from a branch that's been switched off.
export async function GET() {
  const db = await getDb();
  const branches = await db.prepare(
    "SELECT BranchId, Name, Address FROM Branches WHERE IsActive=true ORDER BY DisplayOrder, BranchId"
  ).all();
  return NextResponse.json({
    branches: branches.map(b => ({ BranchId: b.BranchId, Name: b.Name, Address: b.address ?? b.Address ?? null })),
  });
}
