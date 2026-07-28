import { Header, Footer, getContent } from "@/components/SiteChrome";
import { getDb } from "@/lib/db";
import OrderWizard from "./OrderWizard";
export const dynamic = "force-dynamic";
export const metadata = { title: "Order Online — Toast & Roast" };

export default async function OrderPage({ searchParams }) {
  const content = await getContent();
  const db = await getDb();
  const branchId = searchParams?.branch ? parseInt(searchParams.branch, 10) : null;
  const categories = branchId
    ? await db.prepare("SELECT * FROM Categories WHERE IsActive=true AND BranchId=$1 ORDER BY DisplayOrder").all(branchId)
    : await db.prepare("SELECT * FROM Categories WHERE IsActive=true ORDER BY DisplayOrder").all();
  const items = branchId
    ? await db.prepare("SELECT * FROM MenuItems WHERE IsActive=true AND BranchId=$1 ORDER BY DisplayOrder").all(branchId)
    : await db.prepare("SELECT * FROM MenuItems WHERE IsActive=true ORDER BY DisplayOrder").all();
  const tables = branchId
    ? await db.prepare("SELECT * FROM Tables WHERE IsActive=true AND BranchId=$1 ORDER BY DisplayOrder").all(branchId)
    : await db.prepare("SELECT * FROM Tables WHERE IsActive=true ORDER BY DisplayOrder").all();
  const settingsRows = await db.prepare("SELECT * FROM Settings").all();
  const settings = Object.fromEntries(settingsRows.map(s => [s.SettingKey, s.SettingValue]));
  return (
    <>
      <Header content={content} />
      <main className="section container">
        <h2>Order to Your Table</h2>
        <OrderWizard categories={categories} items={items} tables={tables} settings={settings} />
      </main>
      <Footer content={content} />
    </>
  );
}
