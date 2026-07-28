export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getDb, withTransaction, logActivity } from "@/lib/db";
import { requireSection } from "@/lib/auth";
import { selectedBranchId } from "@/lib/branch";
import sahelMenu from "@/lib/seed-data/sahel-menu.json";

// One-click import of a prepared menu into a target branch. Admin-only (gated
// to the "branches" section). Imports into the CURRENTLY-SELECTED branch, and
// refuses if that branch already has categories, so it can't double-import or
// clobber a branch that's already set up. Everything runs in one transaction.
const MENUS = { sahel: sahelMenu };

export async function POST(req) {
  const s = await requireSection("branches");
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { menu } = await req.json().catch(() => ({}));
  const data = MENUS[menu];
  if (!data) return NextResponse.json({ error: "Unknown menu to import." }, { status: 400 });

  const db = await getDb();
  const branchId = await selectedBranchId();
  if (!branchId) return NextResponse.json({ error: "No branch selected." }, { status: 400 });

  // Guard: only import into an empty branch.
  const existing = await db.prepare("SELECT COUNT(*) AS n FROM Categories WHERE BranchId=$1").get(branchId);
  if (Number(existing.n) > 0) {
    return NextResponse.json({ error: "This branch already has categories. Import only works on an empty branch." }, { status: 409 });
  }

  let cats = 0, items = 0;
  try {
    await withTransaction(async (tdb) => {
      let catOrder = 0;
      for (const cat of data) {
        const catRow = await tdb.prepare(
          "INSERT INTO Categories (Name, DisplayOrder, IsActive, Note, BranchId) VALUES ($1,$2,true,$3,$4) RETURNING CategoryId AS id"
        ).run(cat.name, catOrder++, cat.note || null, branchId);
        const categoryId = catRow.lastInsertRowid;
        cats++;
        let itemOrder = 0;
        for (const it of cat.items) {
          await tdb.prepare(
            `INSERT INTO MenuItems (CategoryId, Name, Description, Price, IsAvailable, IsActive, DisplayOrder, BranchId)
             VALUES ($1,$2,$3,$4,true,true,$5,$6)`
          ).run(categoryId, it.name, it.desc || null, it.price, itemOrder++, branchId);
          items++;
        }
      }
    });
  } catch (err) {
    console.error("[import-menu] failed:", err.message);
    return NextResponse.json({ error: "Import failed: " + err.message }, { status: 500 });
  }
  await logActivity(Number(s.sub), "MENU_IMPORT", `${menu} -> branch ${branchId}: ${cats} cats, ${items} items`);
  return NextResponse.json({ ok: true, categories: cats, items });
}
