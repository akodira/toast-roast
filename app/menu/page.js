import { Header, Footer, getContent } from "@/components/SiteChrome";
import { getDb } from "@/lib/db";
import MenuBrowser from "./MenuBrowser";
export const dynamic = "force-dynamic";
export const metadata = { title: "Menu — Toast & Roast" };

export default async function MenuPage() {
  const content = await getContent();
  const db = await getDb();
  const categories = await db.prepare("SELECT * FROM Categories WHERE IsActive=true ORDER BY DisplayOrder").all();
  const items = await db.prepare("SELECT * FROM MenuItems WHERE IsActive=true ORDER BY DisplayOrder").all();
  const settingRows = await db.prepare("SELECT * FROM Settings").all();
  const settings = Object.fromEntries(settingRows.map(r => [r.SettingKey, r.SettingValue]));

  return (
    <>
      <Header content={content} />
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
