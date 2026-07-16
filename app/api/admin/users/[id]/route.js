import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDb, logActivity, withTransaction } from "@/lib/db";
import { requireRole, ROLE_ADMIN, requireSection, SECTION_KEYS } from "@/lib/auth";

export async function PUT(req, { params }) {
  const s = await requireSection("users");
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { Username, FullName, RoleIds, IsActive, Password, Overrides } = await req.json();
  const db = await getDb();

  if (Username !== undefined) {
    if (!Username.trim()) return NextResponse.json({ error: "Username can't be empty." }, { status: 400 });
    const clash = await db.prepare("SELECT UserId FROM Users WHERE Username=$1 AND UserId!=$2").get(Username.trim(), params.id);
    if (clash) return NextResponse.json({ error: "Username already exists." }, { status: 400 });
    await db.prepare("UPDATE Users SET Username=$1 WHERE UserId=$2").run(Username.trim(), params.id);
  }

  if (FullName !== undefined || IsActive !== undefined) {
    await db.prepare("UPDATE Users SET FullName=COALESCE($1,FullName), IsActive=COALESCE($2,IsActive) WHERE UserId=$3")
      .run(FullName !== undefined ? (FullName || null) : null, IsActive !== undefined ? !!IsActive : null, params.id);
  }

  if (Array.isArray(RoleIds)) {
    if (RoleIds.length === 0) return NextResponse.json({ error: "A user needs at least one role." }, { status: 400 });
    const roles = RoleIds.map(Number);
    await withTransaction(async (tdb) => {
      await tdb.prepare("DELETE FROM UserRoles WHERE UserId=$1").run(params.id);
      for (const roleId of roles) await tdb.prepare("INSERT INTO UserRoles (UserId,RoleId) VALUES ($1,$2)").run(params.id, roleId);
      await tdb.prepare("UPDATE Users SET RoleId=$1 WHERE UserId=$2").run(roles[0], params.id); // legacy column, kept for backward compat
    });
  }

  if (Password) {
    if (Password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    await db.prepare("UPDATE Users SET PasswordHash=$1 WHERE UserId=$2").run(bcrypt.hashSync(Password, 10), params.id);
  }

  // Section overrides: replace the user's whole override set with what was sent.
  if (Overrides && typeof Overrides === "object") {
    const ov = Object.entries(Overrides).filter(([k]) => SECTION_KEYS.includes(k));
    await withTransaction(async (tdb) => {
      await tdb.prepare("DELETE FROM UserSectionAccess WHERE UserId=$1").run(params.id);
      for (const [section, allowed] of ov) await tdb.prepare("INSERT INTO UserSectionAccess (UserId,Section,Allowed) VALUES ($1,$2,$3)").run(params.id, section, !!allowed);
    });
  }
  await logActivity(Number(s.sub), "USER_UPDATE", `#${params.id}`);
  return NextResponse.json({ ok: true });
}
