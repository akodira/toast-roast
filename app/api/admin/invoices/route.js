export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireRole, ROLE_ADMIN, ROLE_STAFF, ROLE_MANAGER , requireSection } from "@/lib/auth";
import { selectedBranchId } from "@/lib/branch";

export async function GET(req) {
  const s = await requireSection("invoices");
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const status = new URL(req.url).searchParams.get("status"); // "paid" | "unpaid" | null (all)
  const db = await getDb();
  const branchId = await selectedBranchId();
  let sql = `
    SELECT i.InvoiceId, i.TableId, t.Name AS TableName, i.CustomerId, c.Name AS CustomerName, c.Telephone,
      i.IsPaid, i.PaidAt, i.OccupiedAt, i.CreatedAt,
      COALESCE(SUM(o.Subtotal),0) AS Subtotal, COALESCE(SUM(o.TaxAmount),0) AS TaxAmount,
      COALESCE(SUM(o.ServiceAmount),0) AS ServiceAmount, COALESCE(SUM(o.GrandTotal),0) AS GrandTotal,
      COUNT(o.OrderId) AS OrderCount
    FROM Invoices i
    JOIN Tables t ON t.TableId = i.TableId
    JOIN Customers c ON c.CustomerId = i.CustomerId
    LEFT JOIN Orders o ON o.CustomerId = i.CustomerId AND o.TableNumber = t.Name AND o.CreatedAt >= i.OccupiedAt AND o.Status <> 'Cancelled'
  `;
  const args = [];
  const conds = [];
  if (branchId) { args.push(branchId); conds.push(`i.BranchId=$${args.length}`); }
  if (status === "paid") conds.push("i.IsPaid=true");
  if (status === "unpaid") conds.push("i.IsPaid=false");
  if (conds.length) sql += " WHERE " + conds.join(" AND ");
  sql += " GROUP BY i.InvoiceId, t.Name, c.Name, c.Telephone ORDER BY i.IsPaid ASC, i.CreatedAt DESC";
  const invoices = await db.prepare(sql).all(...args);
  return NextResponse.json({ invoices });
}
