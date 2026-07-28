import { cookies } from "next/headers";
import { getDb } from "@/lib/db";

export const BRANCH_COOKIE = "tr_branch";

// Resolve the admin's currently-selected branch id, server-side. Reads the
// tr_branch cookie; if it's missing or points to a branch that no longer
// exists, falls back to the first branch by display order. Returns a number,
// or null only when there are no branches at all.
export async function selectedBranchId() {
  const db = await getDb();
  const raw = cookies().get(BRANCH_COOKIE)?.value;
  const wanted = raw ? parseInt(raw, 10) : NaN;
  if (Number.isFinite(wanted)) {
    const hit = await db.prepare("SELECT BranchId FROM Branches WHERE BranchId=$1").get(wanted);
    if (hit) return hit.BranchId;
  }
  const first = await db.prepare("SELECT BranchId FROM Branches ORDER BY DisplayOrder, BranchId LIMIT 1").get();
  return first ? first.BranchId : null;
}
