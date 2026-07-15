import { NextResponse } from "next/server";
import { getDb, logActivity } from "@/lib/db";
import { requireRole, ROLE_ADMIN, ROLE_STAFF, ROLE_MANAGER } from "@/lib/auth";

const STATUSES = ["Pending","Preparing","Ready","Served","Completed","Cancelled"];

// Public: fetch invoice by order number
export async function GET(_req, { params }) {
  const db = await getDb();
  const o = await db.prepare(`SELECT o.*, c.Name CustomerName, c.Email, c.Telephone FROM Orders o JOIN Customers c ON c.CustomerId=o.CustomerId WHERE o.OrderNumber=$1`).get(params.id);
  if (!o) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  o.items = await db.prepare("SELECT * FROM OrderDetails WHERE OrderId=$1").all(o.OrderId);
  return NextResponse.json({ order: o });
}

// Admin + Staff: update status
export async function PATCH(req, { params }) {
  const session = await requireRole([ROLE_ADMIN, ROLE_STAFF, ROLE_MANAGER]);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { status } = await req.json().catch(() => ({}));
  if (!STATUSES.includes(status)) return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  const db = await getDb();
  const r = await db.prepare("UPDATE Orders SET Status=$1 WHERE OrderId=$2").run(status, params.id);
  if (!r.changes) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  await logActivity(Number(session.sub), "ORDER_STATUS", `Order #${params.id} -> ${status}`);
  return NextResponse.json({ ok: true });
}

// Admin only: permanently delete an order (and its line items, via ON DELETE CASCADE)
export async function DELETE(_req, { params }) {
  const session = await requireRole([ROLE_ADMIN]);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getDb();
  const existing = await db.prepare("SELECT CustomerId FROM Orders WHERE OrderId=$1").get(params.id);
  if (!existing) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  const r = await db.prepare("DELETE FROM Orders WHERE OrderId=$1").run(params.id);
  // If that was this customer's only order, don't leave a phantom row
  // behind — this is what was making the dashboard's "Customers" count
  // include people with zero actual orders.
  const remaining = await db.prepare("SELECT COUNT(*) c FROM Orders WHERE CustomerId=$1").get(existing.CustomerId);
  if (Number(remaining.c) === 0) {
    // Invoices has a FK to Customers — the customer's now-empty invoice must
    // be removed first, or this DELETE raises invoices_customerid_fkey and
    // the request 500s. An invoice with no orders has nothing to bill.
    await db.prepare("DELETE FROM Invoices WHERE CustomerId=$1").run(existing.CustomerId);
    await db.prepare("DELETE FROM Customers WHERE CustomerId=$1").run(existing.CustomerId);
  }
  await logActivity(Number(session.sub), "ORDER_DELETE", `Order #${params.id}`);
  return NextResponse.json({ ok: true });
}
