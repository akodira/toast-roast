export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireSection } from "@/lib/auth";

// Update a branch's identity, tax/service, order, or active flag. Slug and the
// branch's data assignments are left intact (renaming doesn't re-slug, so any
// existing per-branch links stay valid).
export async function PUT(req, { params }) {
  const s = await requireSection("branches");
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const name = (body.Name || "").trim();
  if (!name) return NextResponse.json({ error: "Branch name is required." }, { status: 400 });
  const db = await getDb();
  await db.prepare(
    `UPDATE Branches SET Name=$1, Address=$2, Phone=$3, TaxPercent=$4, ServicePercent=$5,
       DisplayOrder=$6, IsActive=$7 WHERE BranchId=$8`
  ).run(name, body.Address || null, body.Phone || null,
        body.TaxPercent ?? null, body.ServicePercent ?? null,
        Number.isFinite(body.DisplayOrder) ? body.DisplayOrder : 0,
        body.IsActive === false ? false : true, params.id);
  // "Main" is radio-style: setting this branch as Main clears it on all others,
  // so exactly one branch is ever the public-website default.
  if (body.IsMain === true) {
    await db.prepare("UPDATE Branches SET IsMain=(BranchId=$1)").run(params.id);
  }
  return NextResponse.json({ ok: true });
}

// Deactivating (soft) is preferred over deleting so historical orders/invoices
// keep their branch. We only allow a hard DELETE when the branch has NO data
// assigned (categories/items/tables/orders/invoices), to avoid orphaning
// records or breaking foreign keys.
export async function DELETE(req, { params }) {
  const s = await requireSection("branches");
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getDb();
  const id = params.id;
  const counts = await db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM Categories WHERE BranchId=$1) +
      (SELECT COUNT(*) FROM MenuItems WHERE BranchId=$1) +
      (SELECT COUNT(*) FROM Tables WHERE BranchId=$1) +
      (SELECT COUNT(*) FROM Orders WHERE BranchId=$1) +
      (SELECT COUNT(*) FROM Invoices WHERE BranchId=$1) AS total
  `).get(id);
  if (Number(counts.total) > 0) {
    return NextResponse.json({ error: "This branch still has menu, tables, or orders. Deactivate it instead, or move its data first." }, { status: 409 });
  }
  await db.prepare("DELETE FROM Branches WHERE BranchId=$1").run(id);
  return NextResponse.json({ ok: true });
}
