import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDb, logActivity } from "@/lib/db";
import { createSession } from "@/lib/auth";

export async function POST(req) {
  const { username, password } = await req.json().catch(() => ({}));
  if (!username || !password) return NextResponse.json({ error: "Username and password are required." }, { status: 400 });
  const db = await getDb();
  const user = await db.prepare("SELECT * FROM Users WHERE Username=$1 AND IsActive=true").get(username);
  if (!user || !bcrypt.compareSync(password, user.PasswordHash))
    return NextResponse.json({ error: "Invalid username or password." }, { status: 401 });
  const roleRows = await db.prepare("SELECT RoleId FROM UserRoles WHERE UserId=$1").all(user.UserId);
  const roleIds = roleRows.length ? roleRows.map(r => r.RoleId) : [user.RoleId];
  const ovRows = await db.prepare("SELECT Section, Allowed FROM UserSectionAccess WHERE UserId=$1").all(user.UserId);
  const overrides = Object.fromEntries(ovRows.map(r => [r.Section, !!r.Allowed]));
  const token = await createSession(user, roleIds, overrides);
  await logActivity(user.UserId, "LOGIN", `User ${username} signed in`);
  const res = NextResponse.json({ ok: true });
  res.cookies.set("tr_session", token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 8 });
  return res;
}
