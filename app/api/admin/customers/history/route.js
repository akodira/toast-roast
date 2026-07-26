export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireSection } from "@/lib/auth";
import { PHONE_KEY_SQL } from "@/lib/phone";

// Full order + invoice history for one customer (by phone key). Each order
// includes its line items; invoices are grouped per sitting.
export async function GET(req) {
  const s = await requireSection("customers");
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const key = new URL(req.url).searchParams.get("phoneKey");
  if (!key) return NextResponse.json({ error: "Mobile is required." }, { status: 400 });
  const db = await getDb();

  const custRows = await db.prepare(`SELECT CustomerId FROM Customers WHERE ${PHONE_KEY_SQL("Telephone")} = $1`).all(String(key));
  const ids = custRows.map(r => r.CustomerId);
  if (ids.length === 0) return NextResponse.json({ orders: [], invoices: [] });

  const placeholders = ids.map((_, i) => `$${i + 1}`).join(",");
  // Each order is tagged with the invoice (sitting) it belongs to: the invoice
  // for its table+customer whose OccupiedAt is the latest at or before the order.
  const orders = await db.prepare(
    `SELECT o.OrderId, o.OrderNumber, o.TableNumber, o.Status, o.Subtotal, o.TaxAmount, o.ServiceAmount, o.GrandTotal, o.CreatedAt,
       inv.InvoiceId AS GroupInvoiceId
     FROM Orders o
     LEFT JOIN Tables t ON t.Name = o.TableNumber
     LEFT JOIN LATERAL (
       SELECT i.InvoiceId FROM Invoices i
       WHERE i.CustomerId = o.CustomerId AND i.TableId = t.TableId AND i.OccupiedAt <= o.CreatedAt
       ORDER BY i.OccupiedAt DESC LIMIT 1
     ) inv ON TRUE
     WHERE o.CustomerId IN (${placeholders}) ORDER BY o.CreatedAt DESC`
  ).all(...ids);
  for (const o of orders) {
    o.items = await db.prepare("SELECT ItemName, Quantity, UnitPrice, LineTotal, Sides, Note FROM OrderDetails WHERE OrderId=$1").all(o.OrderId);
  }

  // Invoices for this customer. Totals/counts are computed ONLY from orders
  // whose nearest-preceding invoice IS this invoice (a per-order lateral
  // match), so an earlier sitting never absorbs a later sitting's orders.
  const ph2 = ids.map((_, i) => `$${ids.length + i + 1}`).join(",");
  const invoices = await db.prepare(
    `SELECT i.InvoiceId, t.Name AS TableName, i.IsPaid, i.PaidAt, i.OccupiedAt, i.CreatedAt,
       COALESCE(SUM(CASE WHEN og.Status <> 'Cancelled' THEN og.GrandTotal ELSE 0 END),0) AS Total,
       COUNT(DISTINCT CASE WHEN og.Status <> 'Cancelled' THEN og.OrderId END) AS OrderCount
     FROM Invoices i
     JOIN Tables t ON t.TableId = i.TableId
     LEFT JOIN (
       SELECT o.OrderId, o.Status, o.GrandTotal, inv.InvoiceId AS MatchedInvoiceId
       FROM Orders o
       JOIN Tables ot ON ot.Name = o.TableNumber
       JOIN LATERAL (
         SELECT i2.InvoiceId FROM Invoices i2
         WHERE i2.CustomerId = o.CustomerId AND i2.TableId = ot.TableId AND i2.OccupiedAt <= o.CreatedAt
         ORDER BY i2.OccupiedAt DESC LIMIT 1
       ) inv ON TRUE
       WHERE o.CustomerId IN (${placeholders})
     ) og ON og.MatchedInvoiceId = i.InvoiceId
     WHERE i.CustomerId IN (${ph2})
     GROUP BY i.InvoiceId, t.Name
     ORDER BY i.CreatedAt DESC`
  ).all(...ids, ...ids);

  return NextResponse.json({ orders, invoices });
}
