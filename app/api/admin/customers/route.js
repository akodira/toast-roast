export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getDb, withTransaction } from "@/lib/db";
import { requireSection } from "@/lib/auth";
import { PHONE_KEY_SQL } from "@/lib/phone";

// Customers grouped by mobile (the identity). One row per phone key, even if
// older data created multiple Customer rows for the same number. Name shown is
// the most recent one used; totals/last-visit aggregate across all their rows.
export async function GET() {
  const s = await requireSection("customers");
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getDb();
  const rows = await db.prepare(`
    SELECT
      ${PHONE_KEY_SQL("c.Telephone")} AS phonekey,
      MAX(c.Telephone) AS mobile,
      (ARRAY_AGG(c.Name ORDER BY c.CustomerId DESC))[1] AS custname,
      COUNT(DISTINCT o.OrderId) AS ords,
      MAX(o.CreatedAt) AS lastvisit,
      MIN(c.CustomerId) AS refid
    FROM Customers c
    LEFT JOIN Orders o ON o.CustomerId = c.CustomerId
    GROUP BY ${PHONE_KEY_SQL("c.Telephone")}
    ORDER BY MAX(o.CreatedAt) DESC NULLS LAST
  `).all();
  const customers = rows.map(r => ({
    phoneKey: r.phonekey,
    name: r.custname,
    mobile: r.mobile,
    totalOrders: Number(r.ords || 0),
    lastVisit: r.lastvisit || null,
    refId: r.refid, // a CustomerId we can target for name edits
  }));
  return NextResponse.json({ customers });
}

// Rename a customer (by phone key) — updates the name label on every Customer
// row sharing that mobile, since mobile is the identity. Mobile itself is not
// editable (it would re-identify the person and orphan their orders).
export async function PATCH(req) {
  const s = await requireSection("customers");
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { phoneKey, name } = await req.json();
  if (!phoneKey || !name?.trim()) return NextResponse.json({ error: "Mobile and a name are required." }, { status: 400 });
  const db = await getDb();
  await db.prepare(`UPDATE Customers SET Name=$1 WHERE ${PHONE_KEY_SQL("Telephone")} = $2`).run(name.trim(), String(phoneKey));
  return NextResponse.json({ ok: true });
}

// Delete a customer entirely (by phone key). Removes every Customer row for
// that mobile plus all their orders and invoices. OrderDetails cascade from
// Orders automatically; Orders and Invoices have no cascade from Customers, so
// we clear them explicitly in FK-safe order inside a transaction.
export async function DELETE(req) {
  const s = await requireSection("customers");
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { phoneKey } = await req.json().catch(() => ({}));
  if (!phoneKey) return NextResponse.json({ error: "Mobile is required." }, { status: 400 });
  const key = String(phoneKey);
  try {
    await withTransaction(async (tdb) => {
      const custRows = await tdb.prepare(`SELECT CustomerId FROM Customers WHERE ${PHONE_KEY_SQL("Telephone")} = $1`).all(key);
      const ids = custRows.map(r => r.CustomerId);
      for (const cid of ids) {
        // OrderDetails cascade when Orders go.
        await tdb.prepare("DELETE FROM Orders WHERE CustomerId=$1").run(cid);
        await tdb.prepare("DELETE FROM Invoices WHERE CustomerId=$1").run(cid);
        await tdb.prepare("DELETE FROM Customers WHERE CustomerId=$1").run(cid);
      }
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[customers DELETE] failed:", err.message);
    return NextResponse.json({ error: "Could not delete this customer." }, { status: 500 });
  }
}
