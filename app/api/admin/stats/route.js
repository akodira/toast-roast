export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  const db = await getDb();
  const today = await db.prepare("SELECT COUNT(*) c, COALESCE(SUM(GrandTotal),0) t FROM Orders WHERE CreatedAt::date = CURRENT_DATE").get();
  const pendingRow = await db.prepare("SELECT COUNT(*) c FROM Orders WHERE Status='Pending'").get();
  const completedRow = await db.prepare("SELECT COUNT(*) c FROM Orders WHERE Status='Completed'").get();
  const totalSalesRow = await db.prepare("SELECT COALESCE(SUM(GrandTotal),0) t FROM Orders WHERE Status!='Cancelled'").get();
  const customersRow = await db.prepare("SELECT COUNT(*) c FROM Customers").get();
  const last7 = await db.prepare(`SELECT CreatedAt::date d, COALESCE(SUM(GrandTotal),0) t FROM Orders
    WHERE Status!='Cancelled' AND CreatedAt::date >= CURRENT_DATE - INTERVAL '6 days'
    GROUP BY CreatedAt::date ORDER BY d`).all();
  return NextResponse.json({
    todayOrders: Number(today.c), todayRevenue: Number(today.t),
    pending: Number(pendingRow.c), completed: Number(completedRow.c),
    totalSales: Number(totalSalesRow.t), customers: Number(customersRow.c), last7,
  });
}
