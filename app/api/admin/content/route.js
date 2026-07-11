export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getDb, logActivity } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const db = await getDb();
  const rows = await db.prepare("SELECT * FROM WebsiteContent").all();
  return NextResponse.json({ content: Object.fromEntries(rows.map(r => [r.ContentKey, r.ContentValue])) });
}
export async function PUT(req) {
  const s = await getSession();
  const body = await req.json();
  const db = await getDb();
  for (const [k, v] of Object.entries(body)) {
    await db.prepare(`INSERT INTO WebsiteContent (ContentKey,ContentValue,UpdatedAt) VALUES ($1,$2,NOW())
      ON CONFLICT (ContentKey) DO UPDATE SET ContentValue=EXCLUDED.ContentValue, UpdatedAt=NOW()`).run(k, String(v));
  }
  await logActivity(Number(s.sub), "CONTENT_UPDATE", Object.keys(body).join(","));
  return NextResponse.json({ ok: true });
}
