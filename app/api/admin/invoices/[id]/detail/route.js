export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireRole, ROLE_ADMIN, ROLE_STAFF } from "@/lib/auth";

// Full itemized detail for one invoice — used to render the printable
// receipt (view / PNG / PDF). Merges line items across every order that
// belongs to this invoice's (table, customer, sitting).
export async function GET(_req, { params }) {
  const s = await requireRole([ROLE_ADMIN, ROLE_STAFF]);
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getDb();

  const inv = await db.prepare(`
    SELECT i.InvoiceId, i.TableId, t.Name AS TableName, i.CustomerId, c.Name AS CustomerName, c.Telephone,
      i.IsPaid, i.PaidAt, i.OccupiedAt, i.CreatedAt
    FROM Invoices i JOIN Tables t ON t.TableId=i.TableId JOIN Customers c ON c.CustomerId=i.CustomerId
    WHERE i.InvoiceId=$1
  `).get(params.id);
  if (!inv) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });

  const orders = await db.prepare(`SELECT OrderId, OrderNumber, TaxPercent, ServicePercent FROM Orders
    WHERE CustomerId=$1 AND TableNumber=$2 AND CreatedAt >= $3`).all(inv.CustomerId, inv.TableName, inv.OccupiedAt);

  const lineMap = {};
  let subtotal = 0, tax = 0, service = 0, grand = 0;
  for (const ord of orders) {
    const details = await db.prepare("SELECT * FROM OrderDetails WHERE OrderId=$1").all(ord.OrderId);
    for (const d of details) {
      const key = d.ItemName + "|" + d.UnitPrice;
      if (!lineMap[key]) lineMap[key] = { name: d.ItemName, price: d.UnitPrice, qty: 0, total: 0 };
      lineMap[key].qty += d.Quantity;
      lineMap[key].total += d.LineTotal;
      subtotal += d.LineTotal;
    }
  }
  if (orders.length) {
    const taxP = orders[0].TaxPercent, svcP = orders[0].ServicePercent;
    tax = Math.round((subtotal * taxP / 100) * 100) / 100;
    service = Math.round((subtotal * svcP / 100) * 100) / 100;
    grand = Math.round((subtotal + tax + service) * 100) / 100;
    inv.TaxPercent = taxP; inv.ServicePercent = svcP;
  }

  return NextResponse.json({
    invoice: inv,
    lines: Object.values(lineMap),
    subtotal: Math.round(subtotal * 100) / 100,
    tax, service, grand,
    orderCount: orders.length,
  });
}
