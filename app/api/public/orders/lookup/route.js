export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { phoneKey, PHONE_KEY_SQL } from "@/lib/phone";

// Public: find today's orders by phone number (digits-only match, so
// "+20 100 123 4567" and "01001234567" both work). Restricted to today
// only — this is an unauthenticated lookup, so we deliberately don't let
// it become a way to browse someone's full order history.
// If `name` is also given, results are further narrowed to that exact
// customer — needed because multiple people at one table can share the
// same registered phone number, each with their own orders.
export async function GET(req) {
  const url = new URL(req.url);
  const phoneRaw = url.searchParams.get("phone") || "";
  const name = (url.searchParams.get("name") || "").trim();
  const phone = phoneKey(phoneRaw);
  if (phone.length < 6) return NextResponse.json({ error: "Enter a valid phone number." }, { status: 400 });

  const db = await getDb();
  // Return ALL of today's orders for this customer, each tagged with the
  // invoice/sitting it belongs to and whether that invoice is paid — so the
  // portal can group them into separate invoices per sitting (and never merge
  // a paid past sitting into the current unpaid one). Cancelled orders are
  // still excluded so they never appear on any invoice.
  //
  // An order's sitting is matched to the Invoice for its table+customer whose
  // OccupiedAt is the latest one at or before the order was placed. We compute
  // that per order via a lateral lookup so re-occupancies stay separate.
  const sql = `
    SELECT o.*, c.Name CustomerName, c.Telephone,
      inv.InvoiceId AS GroupInvoiceId, inv.IsPaid AS GroupIsPaid, inv.OccupiedAt AS GroupOccupiedAt
    FROM Orders o
    JOIN Customers c ON c.CustomerId = o.CustomerId
    JOIN Tables t ON t.Name = o.TableNumber
    LEFT JOIN LATERAL (
      SELECT i.InvoiceId, i.IsPaid, i.OccupiedAt
      FROM Invoices i
      WHERE i.CustomerId = o.CustomerId AND i.TableId = t.TableId
        AND i.OccupiedAt <= o.CreatedAt
      ORDER BY i.OccupiedAt DESC
      LIMIT 1
    ) inv ON TRUE
    WHERE ${PHONE_KEY_SQL("c.Telephone")} = $1
      AND o.CreatedAt::date = CURRENT_DATE
      AND o.Status <> 'Cancelled'
      ${name ? "AND c.Name = $2" : ""}
    ORDER BY o.OrderId DESC
  `;
  const orders = name ? await db.prepare(sql).all(phone, name) : await db.prepare(sql).all(phone);
  for (const o of orders) {
    o.items = await db.prepare("SELECT * FROM OrderDetails WHERE OrderId=$1").all(o.OrderId);
  }
  return NextResponse.json({ orders });
}
