import { NextResponse } from "next/server";
import { getDb, logActivity } from "@/lib/db";
import { requireRole, ROLE_ADMIN, ROLE_STAFF, ROLE_MANAGER , requireSection } from "@/lib/auth";

// Admin + Staff: mark an invoice paid/unpaid. When marking paid, if every
// other invoice for that same table sitting is also paid, release the
// table automatically.
export async function PATCH(req, { params }) {
  const s = await requireSection("invoices");
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { IsPaid } = await req.json().catch(() => ({}));
  const db = await getDb();

  const inv = await db.prepare("SELECT * FROM Invoices WHERE InvoiceId=$1").get(params.id);
  if (!inv) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });

  await db.prepare("UPDATE Invoices SET IsPaid=$1, PaidAt=CASE WHEN $1 THEN NOW() ELSE NULL END WHERE InvoiceId=$2")
    .run(!!IsPaid, params.id);
  await logActivity(Number(s.sub), "INVOICE_STATUS", `Invoice #${params.id} -> ${IsPaid ? "Paid" : "Not Paid"}`);

  let tableReleased = false;
  if (IsPaid) {
    const unpaid = await db.prepare("SELECT COUNT(*) c FROM Invoices WHERE TableId=$1 AND OccupiedAt=$2 AND IsPaid=false")
      .get(inv.TableId, inv.OccupiedAt);
    if (Number(unpaid.c) === 0) {
      const r = await db.prepare("UPDATE Tables SET OccupiedBy=NULL, OccupiedName=NULL, OccupiedAt=NULL, PinHash=NULL, PinAttempts=0, PinLockedUntil=NULL WHERE TableId=$1 AND OccupiedAt=$2")
        .run(inv.TableId, inv.OccupiedAt);
      tableReleased = r.changes > 0;
      if (tableReleased) await logActivity(Number(s.sub), "TABLE_AUTO_RELEASE", `Table #${inv.TableId} — all invoices paid`);
    }
  }
  return NextResponse.json({ ok: true, tableReleased });
}
