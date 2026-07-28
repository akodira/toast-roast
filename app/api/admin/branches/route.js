export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireSection } from "@/lib/auth";

// Turn a branch name into a URL-safe slug (used later for per-branch links).
function slugify(s) {
  return String(s || "").toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 140) || "branch";
}

// List all branches with a live count of what's assigned to each, so the admin
// can see at a glance which branches have menus/tables set up.
export async function GET() {
  const s = await requireSection("branches");
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getDb();
  const branches = await db.prepare(`
    SELECT b.*,
      (SELECT COUNT(*) FROM Categories c WHERE c.BranchId = b.BranchId) AS catcount,
      (SELECT COUNT(*) FROM MenuItems m WHERE m.BranchId = b.BranchId) AS itemcount,
      (SELECT COUNT(*) FROM Tables t WHERE t.BranchId = b.BranchId) AS tablecount
    FROM Branches b ORDER BY b.DisplayOrder, b.BranchId
  `).all();
  return NextResponse.json({
    branches: branches.map(b => ({
      BranchId: b.BranchId, Name: b.Name, Slug: b.Slug,
      Address: b.address ?? b.Address ?? null, Phone: b.Phone ?? null,
      Email: b.Email ?? null, OpeningHours: b.OpeningHours ?? null,
      MapUrl: b.MapUrl ?? null, MapEmbed: b.MapEmbed ?? null,
      TaxPercent: b.TaxPercent, ServicePercent: b.ServicePercent,
      DisplayOrder: b.DisplayOrder, IsActive: !!b.IsActive, IsMain: !!b.IsMain,
      Categories: Number(b.catcount || 0), Items: Number(b.itemcount || 0), Tables: Number(b.tablecount || 0),
    })),
  });
}

// Create a new branch. This is the self-service piece: a new branch starts
// empty (no menu/tables), and you build it out via the branch switcher.
export async function POST(req) {
  const s = await requireSection("branches");
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const name = (body.Name || "").trim();
  if (!name) return NextResponse.json({ error: "Branch name is required." }, { status: 400 });
  const db = await getDb();
  // Ensure a unique slug (append -2, -3, … on collision).
  let base = slugify(name), slug = base, n = 2;
  while (await db.prepare("SELECT BranchId FROM Branches WHERE Slug=$1").get(slug)) { slug = `${base}-${n++}`; }
  const order = (await db.prepare("SELECT COALESCE(MAX(DisplayOrder),-1)+1 AS n FROM Branches").get()).n;
  const r = await db.prepare(
    `INSERT INTO Branches (Name, Slug, Address, Phone, Email, OpeningHours, MapUrl, MapEmbed, TaxPercent, ServicePercent, DisplayOrder, IsActive)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING BranchId AS id`
  ).run(name, slug, body.Address || null, body.Phone || null, body.Email || null,
        body.OpeningHours || null, body.MapUrl || null, body.MapEmbed || null,
        body.TaxPercent ?? null, body.ServicePercent ?? null, order, body.IsActive === false ? false : true);
  // If created as Main, make it the sole Main branch.
  if (body.IsMain === true) {
    await db.prepare("UPDATE Branches SET IsMain=(BranchId=$1)").run(r.lastInsertRowid);
  }
  return NextResponse.json({ ok: true, branchId: r.lastInsertRowid });
}
