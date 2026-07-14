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
        <div className="menu-head">
          <h2>Main Menu</h2>
          {content.menu_pdf?.trim() && (
            <a href={content.menu_pdf} className="btn ghost" target="_blank" rel="noopener noreferrer" download>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M7 10l5 5 5-5" /><path d="M12 15V3" />
              </svg>
              Download Menu (PDF)
            </a>
          )}
        </div>
        <MenuBrowser categories={categories} items={items} />
      </main>
      <Footer content={content} />
    </>
  );
}
