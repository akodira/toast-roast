export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDb, logActivity } from "@/lib/db";
import { requireRole, ROLE_ADMIN } from "@/lib/auth";

export async function GET() {
  const s = await requireRole([ROLE_ADMIN]);
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getDb();
  const users = await db.prepare("SELECT UserId,Username,FullName,RoleId,IsActive,CreatedAt FROM Users").all();
  return NextResponse.json({ users });
}
export async function POST(req) {
  const s = await requireRole([ROLE_ADMIN]);
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { Username, Password, FullName, RoleId = 1 } = await req.json();
  if (!Username?.trim() || !Password || Password.length < 8)
    return NextResponse.json({ error: "Username and a password of at least 8 characters are required." }, { status: 400 });
  const db = await getDb();
  const existing = await db.prepare("SELECT UserId FROM Users WHERE Username=$1").get(Username.trim());
  if (existing) return NextResponse.json({ error: "Username already exists." }, { status: 400 });
  try {
    const r = await db.prepare("INSERT INTO Users (Username,PasswordHash,FullName,RoleId) VALUES ($1,$2,$3,$4) RETURNING UserId AS id")
      .run(Username.trim(), bcrypt.hashSync(Password, 10), FullName || null, RoleId);
    await logActivity(Number(s.sub), "USER_CREATE", Username);
    return NextResponse.json({ ok: true, id: r.lastInsertRowid });
  } catch {
    return NextResponse.json({ error: "Username already exists." }, { status: 400 });
  }
}
