export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(req) {
  const db = await getDb();
  const branchId = new URL(req.url).searchParams.get("branch");
  const categories = branchId
    ? await db.prepare("SELECT * FROM Categories WHERE IsActive=true AND BranchId=$1 ORDER BY DisplayOrder").all(branchId)
    : await db.prepare("SELECT * FROM Categories WHERE IsActive=true ORDER BY DisplayOrder").all();
  const items = branchId
    ? await db.prepare("SELECT * FROM MenuItems WHERE IsActive=true AND BranchId=$1 ORDER BY DisplayOrder").all(branchId)
    : await db.prepare("SELECT * FROM MenuItems WHERE IsActive=true ORDER BY DisplayOrder").all();
  const settingsRows = await db.prepare("SELECT * FROM Settings").all();
  const settings = Object.fromEntries(settingsRows.map(s => [s.SettingKey, s.SettingValue]));
  return NextResponse.json({ categories, items, settings });
}
