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
  const orders = await db.prepare(
    `SELECT o.OrderId, o.OrderNumber, o.TableNumber, o.Status, o.Subtotal, o.TaxAmount, o.ServiceAmount, o.GrandTotal, o.CreatedAt
     FROM Orders o WHERE o.CustomerId IN (${placeholders}) ORDER BY o.CreatedAt DESC`
  ).all(...ids);
  for (const o of orders) {
    o.items = await db.prepare("SELECT ItemName, Quantity, UnitPrice, LineTotal, Sides, Note FROM OrderDetails WHERE OrderId=$1").all(o.OrderId);
  }

  // Invoices for this customer, with paid status and a computed total from
  // their (non-cancelled) orders in that sitting.
  const invoices = await db.prepare(
    `SELECT i.InvoiceId, t.Name AS TableName, i.IsPaid, i.PaidAt, i.OccupiedAt, i.CreatedAt,
       COALESCE(SUM(CASE WHEN o.Status <> 'Cancelled' THEN o.GrandTotal ELSE 0 END),0) AS Total,
       COUNT(DISTINCT CASE WHEN o.Status <> 'Cancelled' THEN o.OrderId END) AS OrderCount
     FROM Invoices i
     JOIN Tables t ON t.TableId = i.TableId
     LEFT JOIN Orders o ON o.CustomerId = i.CustomerId AND o.TableNumber = t.Name AND o.CreatedAt >= i.OccupiedAt
     WHERE i.CustomerId IN (${placeholders})
     GROUP BY i.InvoiceId, t.Name
     ORDER BY i.CreatedAt DESC`
  ).all(...ids);

  return NextResponse.json({ orders, invoices });
}
