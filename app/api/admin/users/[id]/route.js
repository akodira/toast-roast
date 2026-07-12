import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDb, logActivity } from "@/lib/db";
import { requireRole, ROLE_ADMIN } from "@/lib/auth";

export async function PUT(req, { params }) {
  const s = await requireRole([ROLE_ADMIN]);
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { FullName, RoleId, IsActive, Password } = await req.json();
  const db = await getDb();
  await db.prepare("UPDATE Users SET FullName=$1,RoleId=$2,IsActive=$3 WHERE UserId=$4").run(FullName || null, RoleId || 1, IsActive ? true : false, params.id);
  if (Password) {
    if (Password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    await db.prepare("UPDATE Users SET PasswordHash=$1 WHERE UserId=$2").run(bcrypt.hashSync(Password, 10), params.id);
  }
  await logActivity(Number(s.sub), "USER_UPDATE", `#${params.id}`);
  return NextResponse.json({ ok: true });
}
