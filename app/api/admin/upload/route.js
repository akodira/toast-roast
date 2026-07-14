import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireRole, ROLE_ADMIN, ROLE_EDITOR } from "@/lib/auth";

const ALLOWED = {
  "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp",
  "application/pdf": ".pdf",   // menu PDF download
};
// PDFs are legitimately bigger than photos — a print menu can easily exceed
// the 3 MB image cap, so give them their own limit rather than rejecting.
const MAX_BYTES = { "application/pdf": 15 * 1024 * 1024 };
const DEFAULT_MAX = 3 * 1024 * 1024;
const BUCKET = (process.env.SUPABASE_STORAGE_BUCKET || "uploads").trim();

// Uses the service role key (server-side only, never exposed to the browser)
// so uploads work regardless of bucket RLS policies. The bucket itself must
// be set to "Public" in the Supabase dashboard so getPublicUrl() works.
function getSupabase() {
  const url = (process.env.SUPABASE_URL || "").trim().replace(/\/+$/, ""); // strip trailing slash(es)
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(req) {
  if (!(await requireRole([ROLE_ADMIN, ROLE_EDITOR]))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  if (!file || typeof file === "string") return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
  const ext = ALLOWED[file.type];
  if (!ext) return NextResponse.json({ error: "Only JPG, PNG, WEBP images or a PDF are allowed." }, { status: 400 });
  const max = MAX_BYTES[file.type] ?? DEFAULT_MAX;
  if (file.size > max)
    return NextResponse.json({ error: `File must be under ${Math.round(max / 1024 / 1024)} MB.` }, { status: 400 });

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Image storage isn't configured yet (missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)." }, { status: 500 });
  }

  const name = `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const supabase = getSupabase();
  const { error } = await supabase.storage.from(BUCKET).upload(name, buffer, {
    contentType: file.type,
    upsert: false,
  });
  if (error) return NextResponse.json({ error: `Upload failed: ${error.message} (bucket: "${BUCKET}")` }, { status: 500 });

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(name);
  return NextResponse.json({ ok: true, url: data.publicUrl });
}
