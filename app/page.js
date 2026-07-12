import Link from "next/link";
import { Header, Footer, getContent } from "@/components/SiteChrome";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Home() {
  const content = await getContent();
  const db = await getDb();
  const cats = await db.prepare("SELECT * FROM Categories WHERE IsActive=true ORDER BY DisplayOrder LIMIT 8").all();
  const picks = await db.prepare(`SELECT m.*, c.Name CatName FROM MenuItems m JOIN Categories c ON c.CategoryId=m.CategoryId
    WHERE m.IsActive=true AND m.IsAvailable=true AND m.IsFeatured=true ORDER BY m.DisplayOrder`).all();

  const hasHeroPhotos = content.hero_image_1 || content.hero_image_2;

  return (
    <>
      <Header content={content} />
      <main>
        <section className="hero-split">
          <div className="container">
            <div>
              <p className="eyebrow">{content.tagline} · Cairo</p>
              <h1 dangerouslySetInnerHTML={{ __html: content.hero_title }} />
              <p className="lead" dangerouslySetInnerHTML={{ __html: content.hero_subtitle }} />
              <div className="cta-row">
                <Link href="/menu" className="btn">Browse the Menu</Link>
                <Link href="/portal" className="btn ghost">My Orders</Link>
              </div>
            </div>
            <div className={`hero-photos ${hasHeroPhotos ? "" : "no-photos"}`}>
              {content.hero_image_1 && <div className="ph1" style={{ backgroundImage: `url(${content.hero_image_1})` }} />}
              {content.hero_image_2 && <div className="ph2" style={{ backgroundImage: `url(${content.hero_image_2})` }} />}
            </div>
          </div>
        </section>

        {picks.length > 0 && (
          <div className="rust-panel">
            <section className="section container">
              <div className="favourites-grid">
                <div>
                  <p className="eyebrow">Selection 01</p>
                  <h2 dangerouslySetInnerHTML={{ __html: content.house_favourites_title }} />
                  {picks.map(p => (
                    <div className="favourites-row" key={p.MenuItemId}>
                      <span>
                        <span className="nm">{p.Name}</span>
                        <span className="tag">{p.CatName}</span>
                      </span>
                      <span className="pr">EGP {p.Price.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="favourites-photo" style={content.favourites_image ? { backgroundImage: `url(${content.favourites_image})` } : undefined} />
              </div>
            </section>
          </div>
        )}

        <section className="section cuisine-section">
          <div className="container">
            <div className="cuisine-photo" style={content.cuisine_image ? { backgroundImage: `url(${content.cuisine_image})` } : undefined} />
            <div>
              <p className="eyebrow">Selection 02</p>
              <h2 dangerouslySetInnerHTML={{ __html: content.cuisine_title }} />
              <div className="cuisine-grid">
                {cats.map((c, i) => (
                  <Link key={c.CategoryId} href="/menu" className="cuisine-card">
                    <span className="num">{String(i + 1).padStart(2, "0")}</span>
                    <span className="nm">{c.Name}</span>
                  </Link>
                ))}
              </div>
              <Link href="/menu" className="cuisine-link">Full menu →</Link>
            </div>
          </div>
        </section>
      </main>
      <Footer content={content} />
    </>
  );
}
