import { NextResponse } from "next/server";
import { getDb, logActivity } from "@/lib/db";
import { getSession } from "@/lib/auth";

const STATUSES = ["Pending","Preparing","Ready","Served","Completed","Cancelled"];

// Public: fetch invoice by order number
export async function GET(_req, { params }) {
  const db = await getDb();
  const o = await db.prepare(`SELECT o.*, c.Name CustomerName, c.Email, c.Telephone FROM Orders o JOIN Customers c ON c.CustomerId=o.CustomerId WHERE o.OrderNumber=$1`).get(params.id);
  if (!o) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  o.items = await db.prepare("SELECT * FROM OrderDetails WHERE OrderId=$1").all(o.OrderId);
  return NextResponse.json({ order: o });
}

// Admin: update status
export async function PATCH(req, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { status } = await req.json().catch(() => ({}));
  if (!STATUSES.includes(status)) return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  const db = await getDb();
  const r = await db.prepare("UPDATE Orders SET Status=$1 WHERE OrderId=$2").run(status, params.id);
  if (!r.changes) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  await logActivity(Number(session.sub), "ORDER_STATUS", `Order #${params.id} -> ${status}`);
  return NextResponse.json({ ok: true });
}

// Admin: permanently delete an order (and its line items, via ON DELETE CASCADE)
export async function DELETE(_req, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getDb();
  const r = await db.prepare("DELETE FROM Orders WHERE OrderId=$1").run(params.id);
  if (!r.changes) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  await logActivity(Number(session.sub), "ORDER_DELETE", `Order #${params.id}`);
  return NextResponse.json({ ok: true });
}
