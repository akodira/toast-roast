import { Header, Footer, getContent } from "@/components/SiteChrome";
import { getDb } from "@/lib/db";
import { publicBranchId } from "@/lib/branch";
import MenuBrowser from "./MenuBrowser";
export const dynamic = "force-dynamic";
export const metadata = { title: "Menu — Toast & Roast" };

export default async function MenuPage({ searchParams }) {
  const content = await getContent();
  const db = await getDb();
  const branchId = await publicBranchId(searchParams?.branch);
  const branches = await db.prepare("SELECT BranchId, Name FROM Branches WHERE IsActive=true ORDER BY DisplayOrder, BranchId").all();
  const categories = await db.prepare("SELECT * FROM Categories WHERE IsActive=true AND BranchId=$1 ORDER BY DisplayOrder").all(branchId);
  const items = await db.prepare("SELECT * FROM MenuItems WHERE IsActive=true AND BranchId=$1 ORDER BY DisplayOrder").all(branchId);
  const settingRows = await db.prepare("SELECT * FROM Settings").all();
  const settings = Object.fromEntries(settingRows.map(r => [r.SettingKey, r.SettingValue]));

  return (
    <>
      <Header content={content} branches={branches} currentBranch={branchId} />
      <main className="menu-page">
        <div className="container">
          <MenuBrowser
            categories={categories}
            items={items}
            eyebrow={content.menu_title || "Our Menu"}
            pdfUrl={content.menu_pdf?.trim() || ""}
            taxPercent={settings.tax_percent}
            servicePercent={settings.service_percent}
          />
        </div>
      </main>
      <Footer content={content} />
    </>
  );
}
