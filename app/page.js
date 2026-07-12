import Link from "next/link";
import { Header, Footer, getContent } from "@/components/SiteChrome";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Home() {
  const content = await getContent();
  const db = await getDb();
  const cats = await db.prepare("SELECT * FROM Categories WHERE IsActive=true ORDER BY DisplayOrder LIMIT 8").all();
  const picks = await db.prepare(`SELECT m.*, c.Name CatName FROM MenuItems m JOIN Categories c ON c.CategoryId=m.CategoryId
    WHERE m.IsActive=true AND m.IsAvailable=true AND m.Name IN ('Creamy Chicken Casserole','Grilled Fillet 250gm','Nutella Lotus','Seafood Platter','Toast & Roast Burger','V60')`).all();
  return (
    <>
      <Header content={content} />
      <main>
        <section className="hero">
          <p className="sub">{content.tagline}</p>
          <h1>{content.hero_title}</h1>
          <p className="lead">{content.hero_subtitle}</p>
          <div className="cta-row">
            <Link href="/portal" className="btn">Order to Your Table</Link>
            <Link href="/menu" className="btn ghost">Browse the Menu</Link>
          </div>
        </section>

        <div className="rust-panel">
          <section className="section container">
            <h2>House Favourites</h2>
            <div className="menu-grid">
              {picks.map(p => (
                <div className="menu-line" key={p.MenuItemId}>
                  <span className="nm">{p.Name}<span className="desc">{p.CatName}</span></span>
                  <span className="dots" /><span className="pr">{p.Price.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="section container">
          <h2>The Menu, In Brief</h2>
          <div className="filters">
            {cats.map(c => <Link key={c.CategoryId} href="/menu" className="chip">{c.Name}</Link>)}
            <Link href="/menu" className="chip on">Full menu →</Link>
          </div>
          <p>{content.footer_note}</p>
        </section>
      </main>
      <Footer content={content} />
    </>
  );
}
