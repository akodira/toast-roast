export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getDb, logActivity, withTransaction } from "@/lib/db";
import { phonesMatch } from "@/lib/phone";
import { checkTablePin } from "@/lib/pin";
import { requireRole, ROLE_ADMIN, ROLE_STAFF, ROLE_MANAGER } from "@/lib/auth";

const round = (n) => Math.round(n * 100) / 100;

export async function POST(req) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  const { tableNumber, name, telephone, items, pin } = body;
  if (!tableNumber || !name || !telephone)
    return NextResponse.json({ error: "Table number, name and telephone are required." }, { status: 400 });
  if (!Array.isArray(items) || items.length === 0)
    return NextResponse.json({ error: "Your cart is empty." }, { status: 400 });

  const db = await getDb();

  // The real security boundary. Two independent checks must both pass:
  //   1. The table is registered to this phone number (claim/join), AND
  //   2. The caller supplies the table's current PIN (verified with lockout).
  // The phone tie keeps orders attached to the right customer/invoice; the
  // PIN is the secret that stops a stranger ordering to someone else's table.
  const table = await db.prepare("SELECT TableId, OccupiedBy, OccupiedAt FROM Tables WHERE Name=$1 AND IsActive=true").get(String(tableNumber).trim());
  if (!table || !table.OccupiedBy || !phonesMatch(table.OccupiedBy, telephone))
    return NextResponse.json({ error: "This table isn't registered to your phone number. Please register or join it at /portal first." }, { status: 403 });

  const pinCheck = await checkTablePin(db, table.TableId, pin);
  if (!pinCheck.ok) return NextResponse.json({ error: pinCheck.error }, { status: pinCheck.status });
  const settingsRows = await db.prepare("SELECT * FROM Settings").all();
  const settings = Object.fromEntries(settingsRows.map(s => [s.SettingKey, s.SettingValue]));
  const taxP = parseFloat(settings.tax_percent || "14");
  const svcP = parseFloat(settings.service_percent || "12");

  // Server-side price lookup — never trust client prices
  const lines = [];
  for (const it of items) {
    const qty = parseInt(it.quantity, 10);
    if (!qty || qty < 1 || qty > 99) return NextResponse.json({ error: "Invalid quantity." }, { status: 400 });
    const row = await db.prepare("SELECT * FROM MenuItems WHERE MenuItemId=$1 AND IsActive=true AND IsAvailable=true").get(it.menuItemId);
    if (!row) return NextResponse.json({ error: "One of the items is no longer available." }, { status: 400 });
    lines.push({ id: row.MenuItemId, name: row.Name, price: row.Price, qty, total: round(row.Price * qty) });
  }
  const subtotal = round(lines.reduce((s, l) => s + l.total, 0));
  const taxAmount = round(subtotal * taxP / 100);
  const serviceAmount = round(subtotal * svcP / 100);
  const grandTotal = round(subtotal + taxAmount + serviceAmount);
  const orderNumber = "TR-" + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 90 + 10);

  await withTransaction(async (tdb) => {
    // Find-or-create: the same phone+name combo (e.g. someone ordering a
    // second round today) reuses their existing Customer row instead of
    // creating a fresh duplicate every single order.
    const existing = await tdb.prepare("SELECT CustomerId FROM Customers WHERE Telephone=$1 AND Name=$2 ORDER BY CustomerId DESC LIMIT 1")
      .get(telephone.trim(), name.trim());
    const customerId = existing
      ? existing.CustomerId
      : (await tdb.prepare("INSERT INTO Customers (Name,Telephone) VALUES ($1,$2) RETURNING CustomerId AS id").run(name.trim(), telephone.trim())).lastInsertRowid;
    const ord = await tdb.prepare(`INSERT INTO Orders (OrderNumber,CustomerId,TableNumber,Subtotal,TaxPercent,TaxAmount,ServicePercent,ServiceAmount,GrandTotal,Status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'Pending') RETURNING OrderId AS id`).run(orderNumber, customerId, String(tableNumber).trim(), subtotal, taxP, taxAmount, svcP, serviceAmount, grandTotal);
    for (const l of lines) {
      await tdb.prepare("INSERT INTO OrderDetails (OrderId,MenuItemId,ItemName,UnitPrice,Quantity,LineTotal) VALUES ($1,$2,$3,$4,$5,$6)")
        .run(ord.lastInsertRowid, l.id, l.name, l.price, l.qty, l.total);
    }
    // One invoice per (table occupancy, customer) — created on their first
    // order this sitting, reused for every order after. This is what lets
    // staff mark "this customer's invoice" paid and auto-release the table
    // once everyone at it has paid.
    await tdb.prepare(`INSERT INTO Invoices (TableId,CustomerId,OccupiedAt) VALUES ($1,$2,$3)
      ON CONFLICT (TableId,CustomerId,OccupiedAt) DO NOTHING`).run(table.TableId, customerId, table.OccupiedAt);
    return ord.lastInsertRowid;
  });
  return NextResponse.json({ ok: true, orderNumber });
}

export async function GET(req) {
  const session = await requireRole([ROLE_ADMIN, ROLE_STAFF, ROLE_MANAGER]);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const status = new URL(req.url).searchParams.get("status");
  const db = await getDb();
  let sql = `SELECT o.*, c.Name CustomerName, c.Email, c.Telephone FROM Orders o JOIN Customers c ON c.CustomerId=o.CustomerId`;
  const args = [];
  if (status && status !== "All") { sql += " WHERE o.Status=$1"; args.push(status); }
  sql += " ORDER BY o.OrderId DESC LIMIT 200";
  const orders = await db.prepare(sql).all(...args);
  for (const o of orders) o.items = await db.prepare("SELECT * FROM OrderDetails WHERE OrderId=$1").all(o.OrderId);
  return NextResponse.json({ orders });
}
