export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSession } from "@/lib/auth";
import { BRANCH_COOKIE, selectedBranchId, branchesForCurrentUser, canAccessBranch } from "@/lib/branch";

// Available to any signed-in admin. Returns ONLY the branches this user may
// access (branch-limited users see just theirs; unrestricted users see all),
// plus the currently-selected id.
export async function GET() {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const branches = await branchesForCurrentUser();
  const current = await selectedBranchId();
  return NextResponse.json({ branches, current });
}

// Switch the working branch — only to a branch the user is allowed to access.
export async function POST(req) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { branchId } = await req.json().catch(() => ({}));
  if (!(await canAccessBranch(branchId))) {
    return NextResponse.json({ error: "You don't have access to that branch." }, { status: 403 });
  }
  cookies().set(BRANCH_COOKIE, String(Number(branchId)), { httpOnly: false, sameSite: "lax", path: "/" });
  return NextResponse.json({ ok: true, current: Number(branchId) });
}
