export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireRole, ROLE_ADMIN, ROLE_MANAGER } from "@/lib/auth";

// All KPIs below are computed ONLY from data the system already stores
// (orders, order lines, menu, categories, tables). Cost-based metrics
// (COGS, profit margin, labour %) are intentionally absent — the system
// has no cost data, and inventing them would be misleading.
export async function GET() {
  if (!(await requireRole([ROLE_ADMIN, ROLE_MANAGER]))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getDb();
  const paid = "Status != 'Cancelled'"; // revenue counts everything except cancelled

  // --- headline cards ---
  const today = await db.prepare(`SELECT COUNT(*) c, COALESCE(SUM(GrandTotal),0) t FROM Orders WHERE CreatedAt::date = CURRENT_DATE AND ${paid}`).get();
  const pendingRow = await db.prepare("SELECT COUNT(*) c FROM Orders WHERE Status='Pending'").get();
  const completedRow = await db.prepare("SELECT COUNT(*) c FROM Orders WHERE Status='Completed'").get();
  const totalSalesRow = await db.prepare(`SELECT COALESCE(SUM(GrandTotal),0) t, COUNT(*) c FROM Orders WHERE ${paid}`).get();
  const customersRow = await db.prepare("SELECT COUNT(*) c FROM Customers").get();

  const totalOrders = Number(totalSalesRow.c) || 0;
  const totalSales = Number(totalSalesRow.t) || 0;
  const avgOrderValue = totalOrders ? totalSales / totalOrders : 0;

  // avg spend per customer (distinct customers who actually ordered)
  const spendRow = await db.prepare(`SELECT COUNT(DISTINCT CustomerId) c, COALESCE(SUM(GrandTotal),0) t FROM Orders WHERE ${paid}`).get();
  const avgPerCustomer = Number(spendRow.c) ? Number(spendRow.t) / Number(spendRow.c) : 0;

  // cancellation rate
  const cancelRow = await db.prepare("SELECT COUNT(*) c FROM Orders").get();
  const cancelledRow = await db.prepare("SELECT COUNT(*) c FROM Orders WHERE Status='Cancelled'").get();
  const allOrders = Number(cancelRow.c) || 0;
  const cancelRate = allOrders ? (Number(cancelledRow.c) / allOrders) * 100 : 0;

  // repeat customers (ordered on 2+ distinct days)
  const repeatRow = await db.prepare(`SELECT COUNT(*) c FROM (
    SELECT CustomerId FROM Orders WHERE ${paid}
    GROUP BY CustomerId HAVING COUNT(DISTINCT CreatedAt::date) > 1) x`).get();

  // --- revenue last 14 days (for the line chart) ---
  const last14 = await db.prepare(`SELECT CreatedAt::date d, COALESCE(SUM(GrandTotal),0) t, COUNT(*) n FROM Orders
    WHERE ${paid} AND CreatedAt::date >= CURRENT_DATE - INTERVAL '13 days'
    GROUP BY CreatedAt::date ORDER BY d`).all();

  // --- top 10 most ordered items (by quantity) ---
  const topItems = await db.prepare(`SELECT od.ItemName name, SUM(od.Quantity) qty, COALESCE(SUM(od.LineTotal),0) revenue
    FROM OrderDetails od JOIN Orders o ON o.OrderId = od.OrderId
    WHERE o.${paid}
    GROUP BY od.ItemName ORDER BY qty DESC LIMIT 10`).all();

  // --- slowest 5 movers (menu items that exist but sell least; 0 = never) ---
  const slowItems = await db.prepare(`SELECT mi.Name name, COALESCE(SUM(od.Quantity),0) qty
    FROM MenuItems mi
    LEFT JOIN OrderDetails od ON od.MenuItemId = mi.MenuItemId
    LEFT JOIN Orders o ON o.OrderId = od.OrderId AND o.${paid}
    WHERE mi.IsActive = true
    GROUP BY mi.Name ORDER BY qty ASC, mi.Name LIMIT 5`).all();

  // --- sales by category ---
  const byCategory = await db.prepare(`SELECT COALESCE(c.Name,'Uncategorised') name, COALESCE(SUM(od.LineTotal),0) revenue, SUM(od.Quantity) qty
    FROM OrderDetails od
    JOIN Orders o ON o.OrderId = od.OrderId AND o.${paid}
    LEFT JOIN MenuItems mi ON mi.MenuItemId = od.MenuItemId
    LEFT JOIN Categories c ON c.CategoryId = mi.CategoryId
    GROUP BY c.Name ORDER BY revenue DESC`).all();

  // --- revenue by hour of day (peak hours) ---
  const byHour = await db.prepare(`SELECT EXTRACT(HOUR FROM CreatedAt)::int h, COALESCE(SUM(GrandTotal),0) t, COUNT(*) n
    FROM Orders WHERE ${paid}
    GROUP BY h ORDER BY h`).all();

  // --- busiest tables (by order count + revenue) ---
  const byTable = await db.prepare(`SELECT TableNumber name, COUNT(*) orders, COALESCE(SUM(GrandTotal),0) revenue
    FROM Orders WHERE ${paid}
    GROUP BY TableNumber ORDER BY revenue DESC LIMIT 8`).all();

  return NextResponse.json({
    todayOrders: Number(today.c), todayRevenue: Number(today.t),
    pending: Number(pendingRow.c), completed: Number(completedRow.c),
    totalSales, customers: Number(customersRow.c),
    avgOrderValue, avgPerCustomer, cancelRate,
    repeatCustomers: Number(repeatRow.c), totalOrders,
    last14: last14.map(r => ({ d: r.d, t: Number(r.t), n: Number(r.n) })),
    topItems: topItems.map(r => ({ name: r.name, qty: Number(r.qty), revenue: Number(r.revenue) })),
    slowItems: slowItems.map(r => ({ name: r.name, qty: Number(r.qty) })),
    byCategory: byCategory.map(r => ({ name: r.name, revenue: Number(r.revenue), qty: Number(r.qty || 0) })),
    byHour: byHour.map(r => ({ h: Number(r.h), t: Number(r.t), n: Number(r.n) })),
    byTable: byTable.map(r => ({ name: r.name, orders: Number(r.orders), revenue: Number(r.revenue) })),
  });
}
