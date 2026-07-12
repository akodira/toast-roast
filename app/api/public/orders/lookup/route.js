export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// Public: find today's orders by phone number (digits-only match, so
// "+20 100 123 4567" and "01001234567" both work). Restricted to today
// only — this is an unauthenticated lookup, so we deliberately don't let
// it become a way to browse someone's full order history.
export async function GET(req) {
  const phoneRaw = new URL(req.url).searchParams.get("phone") || "";
  const phone = phoneRaw.replace(/\D/g, "");
  if (phone.length < 6) return NextResponse.json({ error: "Enter a valid phone number." }, { status: 400 });

  const db = await getDb();
  const orders = await db.prepare(`
    SELECT o.*, c.Name CustomerName, c.Email, c.Telephone FROM Orders o
    JOIN Customers c ON c.CustomerId = o.CustomerId
    WHERE regexp_replace(c.Telephone, '\\D', '', 'g') = $1
      AND o.CreatedAt::date = CURRENT_DATE
    ORDER BY o.OrderId DESC
  `).all(phone);
  for (const o of orders) o.items = await db.prepare("SELECT * FROM OrderDetails WHERE OrderId=$1").all(o.OrderId);
  return NextResponse.json({ orders });
}
