import { cookies } from "next/headers";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const BRANCH_COOKIE = "tr_branch";

// The set of branch ids a user may access. RULE: a user with NO branch
// assignments can access ALL branches (the default — keeps existing users
// working and prevents anyone locking every admin out of a branch). Once a
// user has one or more UserBranches rows, they're limited to exactly those.
// Returns { all: true } for unrestricted, or { all: false, ids: number[] }.
export async function allowedBranchIds(userId) {
  const db = await getDb();
  if (!userId) return { all: true, ids: [] };
  const rows = await db.prepare("SELECT BranchId FROM UserBranches WHERE UserId=$1").all(userId);
  if (!rows.length) return { all: true, ids: [] };
  return { all: false, ids: rows.map(r => r.BranchId) };
}

// The branches (id + name + active) the current signed-in user may switch
// between, in display order. Unrestricted users get all branches.
export async function branchesForCurrentUser() {
  const db = await getDb();
  const s = await getSession();
  const userId = s ? Number(s.sub) : null;
  const access = await allowedBranchIds(userId);
  const all = await db.prepare("SELECT BranchId, Name, IsActive FROM Branches ORDER BY DisplayOrder, BranchId").all();
  const filtered = access.all ? all : all.filter(b => access.ids.includes(b.BranchId));
  return filtered.map(b => ({ BranchId: b.BranchId, Name: b.Name, IsActive: !!b.IsActive }));
}

// Resolve the current user's selected branch id, server-side, CONSTRAINED to
// the branches they're allowed to access. Reads the tr_branch cookie; if it's
// missing or points to a branch they can't access, falls back to their first
// allowed branch. Returns a number, or null when they have no branches.
export async function selectedBranchId() {
  const db = await getDb();
  const s = await getSession();
  const userId = s ? Number(s.sub) : null;
  const access = await allowedBranchIds(userId);

  const raw = cookies().get(BRANCH_COOKIE)?.value;
  const wanted = raw ? parseInt(raw, 10) : NaN;
  if (Number.isFinite(wanted) && (access.all || access.ids.includes(wanted))) {
    const hit = await db.prepare("SELECT BranchId FROM Branches WHERE BranchId=$1").get(wanted);
    if (hit) return hit.BranchId;
  }
  if (access.all) {
    const first = await db.prepare("SELECT BranchId FROM Branches ORDER BY DisplayOrder, BranchId LIMIT 1").get();
    return first ? first.BranchId : null;
  }
  if (access.ids.length) {
    const first = await db.prepare(
      "SELECT BranchId FROM Branches WHERE BranchId = ANY($1) ORDER BY DisplayOrder, BranchId LIMIT 1"
    ).get(access.ids);
    return first ? first.BranchId : null;
  }
  return null;
}

// Guard: can the current user access this specific branch? Used by APIs that
// take a branch from a query param instead of the cookie.
export async function canAccessBranch(branchId) {
  const s = await getSession();
  const access = await allowedBranchIds(s ? Number(s.sub) : null);
  return access.all || access.ids.includes(Number(branchId));
}

// Resolve which branch the PUBLIC website should show. PUBLIC — not restricted.
export async function publicBranchId(requested) {
  const db = await getDb();
  const wanted = requested ? parseInt(requested, 10) : NaN;
  if (Number.isFinite(wanted)) {
    const hit = await db.prepare("SELECT BranchId FROM Branches WHERE BranchId=$1 AND IsActive=true").get(wanted);
    if (hit) return hit.BranchId;
  }
  const main = await db.prepare("SELECT BranchId FROM Branches WHERE IsMain=true AND IsActive=true ORDER BY DisplayOrder, BranchId LIMIT 1").get();
  if (main) return main.BranchId;
  const first = await db.prepare("SELECT BranchId FROM Branches WHERE IsActive=true ORDER BY DisplayOrder, BranchId LIMIT 1").get();
  return first ? first.BranchId : null;
}
