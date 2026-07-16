export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDb, logActivity, withTransaction } from "@/lib/db";
import { requireRole, ROLE_ADMIN, requireSection, SECTION_KEYS } from "@/lib/auth";

export async function GET() {
  const s = await requireSection("users");
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getDb();
  const users = await db.prepare("SELECT UserId,Username,FullName,IsActive,CreatedAt FROM Users").all();
  const roleRows = await db.prepare("SELECT UserId, RoleId FROM UserRoles").all();
  const ovRows = await db.prepare("SELECT UserId, Section, Allowed FROM UserSectionAccess").all();
  for (const u of users) {
    u.RoleIds = roleRows.filter(r => r.UserId === u.UserId).map(r => r.RoleId);
    u.Overrides = Object.fromEntries(ovRows.filter(r => r.UserId === u.UserId).map(r => [r.Section, !!r.Allowed]));
  }
  return NextResponse.json({ users });
}
export async function POST(req) {
  const s = await requireSection("users");
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { Username, Password, FullName, RoleIds, Overrides } = await req.json();
  const roles = Array.isArray(RoleIds) && RoleIds.length ? RoleIds.map(Number) : [1];
  if (!Username?.trim() || !Password || Password.length < 8)
    return NextResponse.json({ error: "Username and a password of at least 8 characters are required." }, { status: 400 });
  const db = await getDb();
  const existing = await db.prepare("SELECT UserId FROM Users WHERE Username=$1").get(Username.trim());
  if (existing) return NextResponse.json({ error: "Username already exists." }, { status: 400 });
  // Only keep overrides for real section keys.
  const ov = Object.entries(Overrides || {}).filter(([k]) => SECTION_KEYS.includes(k));
  try {
    const id = await withTransaction(async (tdb) => {
      const r = await tdb.prepare("INSERT INTO Users (Username,PasswordHash,FullName,RoleId) VALUES ($1,$2,$3,$4) RETURNING UserId AS id")
        .run(Username.trim(), bcrypt.hashSync(Password, 10), FullName || null, roles[0]);
      for (const roleId of roles) await tdb.prepare("INSERT INTO UserRoles (UserId,RoleId) VALUES ($1,$2)").run(r.lastInsertRowid, roleId);
      for (const [section, allowed] of ov) await tdb.prepare("INSERT INTO UserSectionAccess (UserId,Section,Allowed) VALUES ($1,$2,$3)").run(r.lastInsertRowid, section, !!allowed);
      return r.lastInsertRowid;
    });
    await logActivity(Number(s.sub), "USER_CREATE", Username);
    return NextResponse.json({ ok: true, id });
  } catch {
    return NextResponse.json({ error: "Username already exists." }, { status: 400 });
  }
}
