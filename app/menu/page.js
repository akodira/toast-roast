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
  return (
    <>
      <Header content={content} />
      <main className="section container">
        <h2>Main Menu</h2>
        <MenuBrowser categories={categories} items={items} footerNote={content.footer_note} />
      </main>
      <Footer content={content} />
    </>
  );
}
