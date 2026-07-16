export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getSession, sessionRoles, sessionSections, ROLE_NAMES } from "@/lib/auth";

export async function GET() {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const roles = sessionRoles(s);
  return NextResponse.json({
    username: s.username, roles,
    roleNames: roles.map(r => ROLE_NAMES[r] || "Unknown"),
    sections: sessionSections(s),
  });
}
