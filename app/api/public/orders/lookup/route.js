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
  // Only return orders for the customer's CURRENT unpaid sitting — not their
  // whole day. An invoice is keyed by (TableId, CustomerId, OccupiedAt); once
  // it's paid and the table is released + re-occupied, OccupiedAt changes and
  // a fresh invoice begins. We therefore return only orders whose table is
  // still occupied under an OccupiedAt that has an UNPAID invoice for this
  // customer. Cancelled orders are excluded so they never hit the invoice.
  const sql = `
    SELECT o.*, c.Name CustomerName, c.Telephone FROM Orders o
    JOIN Customers c ON c.CustomerId = o.CustomerId
    JOIN Tables t ON t.Name = o.TableNumber
    JOIN Invoices inv ON inv.TableId = t.TableId
      AND inv.CustomerId = o.CustomerId
      AND inv.OccupiedAt = t.OccupiedAt
    WHERE ${PHONE_KEY_SQL("c.Telephone")} = $1
      AND o.CreatedAt::date = CURRENT_DATE
      AND o.CreatedAt >= t.OccupiedAt
      AND inv.IsPaid = FALSE
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
