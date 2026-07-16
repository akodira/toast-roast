export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// Public: a customer rates the service (1–5) with an optional comment.
export async function POST(req) {
  const { tableName, customerName, phone, score, comment } = await req.json().catch(() => ({}));
  const n = parseInt(score, 10);
  if (!n || n < 1 || n > 5) return NextResponse.json({ error: "Please choose a rating from 1 to 5." }, { status: 400 });

  const db = await getDb();
  await db.prepare("INSERT INTO Ratings (TableName,CustomerName,Phone,Score,Comment) VALUES ($1,$2,$3,$4,$5)")
    .run(tableName ? String(tableName) : null, customerName ? String(customerName) : null,
         phone ? String(phone) : null, n, (comment || "").toString().trim().slice(0, 500) || null);
  return NextResponse.json({ ok: true });
}
