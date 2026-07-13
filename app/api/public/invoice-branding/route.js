export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getContent } from "@/components/SiteChrome";

// Public: just the handful of fields shown on a printed receipt (name,
// tagline, logo, branch line, footer note, accent color). This is
// information that's already handed to every customer on paper, so there's
// nothing sensitive here — it's a thin public endpoint mainly so the Admin
// Invoices page (used by both Admin and Staff) can render a receipt without
// needing the broader Admin-only Website Content permissions.
export async function GET() {
  const content = await getContent();
  const { site_name, tagline, invoice_logo, invoice_branch_line, invoice_footer_note, theme_primary_color } = content;
  return NextResponse.json({ site_name, tagline, invoice_logo, invoice_branch_line, invoice_footer_note, theme_primary_color });
}
