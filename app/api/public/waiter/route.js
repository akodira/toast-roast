export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// Public: a seated customer calls the waiter. We record the request so the
// back office sees it (by name + table) and can respond. Lightweight — no PIN
// needed to call for help, but we do require an active session's basics.
export async function POST(req) {
  const { tableName, customerName, phone } = await req.json().catch(() => ({}));
  if (!tableName || !customerName) return NextResponse.json({ error: "Missing table or name." }, { status: 400 });

  const db = await getDb();
  // Don't stack duplicate open calls for the same table — refresh the time instead.
  const open = await db.prepare("SELECT CallId FROM WaiterCalls WHERE TableName=$1 AND Status='Open'").get(String(tableName));
  if (open) {
    await db.prepare("UPDATE WaiterCalls SET CreatedAt=NOW(), CustomerName=$1 WHERE CallId=$2").run(String(customerName), open.CallId);
    return NextResponse.json({ ok: true, already: true });
  }
  const t = await db.prepare("SELECT TableId FROM Tables WHERE Name=$1").get(String(tableName));
  await db.prepare("INSERT INTO WaiterCalls (TableId,TableName,CustomerName,Phone) VALUES ($1,$2,$3,$4)")
    .run(t?.TableId || null, String(tableName), String(customerName), phone ? String(phone) : null);
  return NextResponse.json({ ok: true });
}
