export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getDb, logActivity } from "@/lib/db";
import { requireRole, ROLE_ADMIN , requireSection } from "@/lib/auth";
import { sanitizeHtml } from "@/lib/sanitize";

// Keys that hold URLs / plain identifiers, NOT rich text — never run these
// through the HTML sanitizer (it would corrupt a URL). Everything else is
// treated as editor HTML and sanitized before storage.
const RAW_KEYS = new Set([
  "site_logo", "hero_image", "join_image", "contact_photo", "menu_pdf",
  "invoice_logo", "map_url", "map_embed", "theme_primary_color",
  "theme_font_heading", "theme_font_body",
]);
// Per-feature image keys follow patterns (story_N_image, about_feat_N_icon).
const isRawKey = (k) => RAW_KEYS.has(k) || /_(image|icon|photo|url|logo|pdf)$/.test(k) ||
  k.startsWith("social_") || /^(facebook|instagram|twitter|tiktok|youtube|whatsapp|linkedin)$/.test(k);

export async function GET() {
  const s = await requireSection("content");
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getDb();
  const rows = await db.prepare("SELECT * FROM WebsiteContent").all();
  return NextResponse.json({ content: Object.fromEntries(rows.map(r => [r.ContentKey, r.ContentValue])) });
}
export async function PUT(req) {
  const s = await requireSection("content");
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const db = await getDb();
  for (const [k, v] of Object.entries(body)) {
    // Rich-text fields are sanitized (the trust boundary); URL/image fields
    // are stored as-is.
    const value = isRawKey(k) ? String(v ?? "") : sanitizeHtml(v);
    await db.prepare(`INSERT INTO WebsiteContent (ContentKey,ContentValue,UpdatedAt) VALUES ($1,$2,NOW())
      ON CONFLICT (ContentKey) DO UPDATE SET ContentValue=EXCLUDED.ContentValue, UpdatedAt=NOW()`).run(k, value);
  }
  await logActivity(Number(s.sub), "CONTENT_UPDATE", Object.keys(body).join(","));
  return NextResponse.json({ ok: true });
}
