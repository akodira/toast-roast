export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getDb, logActivity } from "@/lib/db";
import { requireRole, ROLE_ADMIN } from "@/lib/auth";

export async function GET() {
  const s = await requireRole([ROLE_ADMIN]);
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getDb();
  const rows = await db.prepare("SELECT * FROM Settings").all();
  return NextResponse.json({ settings: Object.fromEntries(rows.map(r => [r.SettingKey, r.SettingValue])) });
}
export async function PUT(req) {
  const s = await requireRole([ROLE_ADMIN]);
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const db = await getDb();
  for (const [k, v] of Object.entries(body)) {
    if (["tax_percent","service_percent"].includes(k) && (isNaN(parseFloat(v)) || parseFloat(v) < 0 || parseFloat(v) > 100))
      return NextResponse.json({ error: `${k} must be a number between 0 and 100.` }, { status: 400 });
    await db.prepare(`INSERT INTO Settings (SettingKey,SettingValue) VALUES ($1,$2)
      ON CONFLICT (SettingKey) DO UPDATE SET SettingValue=EXCLUDED.SettingValue`).run(k, String(v));
  }
  await logActivity(Number(s.sub), "SETTINGS_UPDATE", JSON.stringify(body));
  return NextResponse.json({ ok: true });
}
