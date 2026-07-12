export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getSession, ROLE_NAMES } from "@/lib/auth";

export async function GET() {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = Number(s.role);
  return NextResponse.json({ username: s.username, role, roleName: ROLE_NAMES[role] || "Unknown" });
}
