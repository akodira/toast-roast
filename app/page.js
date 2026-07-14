import Link from "next/link";
import { Header, Footer, getContent } from "@/components/SiteChrome";
import { getDb } from "@/lib/db";
import HomeMenu, { ItemCard } from "./HomeMenu";
import JoinTableBox from "./JoinTableBox";

export const dynamic = "force-dynamic";

const FEATURE_ICONS = [
  <><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" /><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" /></>,
  <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z" />,
  <><path d="M17 8h1a4 4 0 1 1 0 8h-1" /><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" /><path d="M6 2v2M10 2v2M14 2v2" /></>,
  <><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1Z" /><path d="m9 12 2 2 4-4" /></>,
];

export default async function Home() {
  const content = await getContent();
  const db = await getDb();

  const cats = await db.prepare("SELECT * FROM Categories WHERE IsActive=true ORDER BY DisplayOrder").all();
  const items = await db.prepare("SELECT * FROM MenuItems WHERE IsActive=true AND IsAvailable=true ORDER BY DisplayOrder").all();
  const picks = items.filter(i => i.IsFeatured).slice(0, 4);

  const features = [1, 2, 3, 4]
    .map(n => ({ title: content[`feature_${n}_title`], text: content[`feature_${n}_text`] }))
    .filter(f => f.title);

  return (
    <>
      <div className="hero">
        <div className={`hero-bg ${content.hero_image ? "" : "no-photo"}`}
          style={content.hero_image ? { backgroundImage: `url(${content.hero_image})` } : undefined} />
        <div className="hero-inner">
          <Header content={content} onHero />
          <div className="container">
            <div className="hero-copy">
              <h1 dangerouslySetInnerHTML={{ __html: content.hero_title }} />
              <p className="lead" dangerouslySetInnerHTML={{ __html: content.hero_subtitle }} />
              <div className="cta-row">
                <Link href="/menu" className="btn">
                  View Menu
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M3 2v7c0 1.1.9 2 2 2h1a2 2 0 0 0 2-2V2M6 2v20M18 8V2c-2 .5-3 2-3 4.5S16 11 18 11v11" />
                  </svg>
                </Link>
                <Link href="/portal" className="btn btn-outline-light">
                  Order Now
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M19 21a7 7 0 0 0-14 0" /><circle cx="12" cy="7" r="4" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main>
        {picks.length > 0 && (
          <section className="section popular">
            <div className="container">
              <div className="sec-head">
                <h2>{content.popular_title || "Popular Items"}</h2>
                <div className="rule"><i /><span className="dot" /><i /></div>
              </div>
              <div className="pop-grid">
                {picks.map(i => <ItemCard key={i.MenuItemId} item={i} badge="Popular" />)}
              </div>
            </div>
          </section>
        )}

        <section className="section">
          <div className="container">
            <div className="sec-head">
              <h2>{content.menu_title || "Our Menu"}</h2>
              <div className="rule"><i /><span className="dot" /><i /></div>
            </div>
            <HomeMenu categories={cats} items={items} />
          </div>
        </section>

        <section className="section" style={{ paddingTop: 0 }}>
          <div className="container">
            <div className="join">
              <JoinTableBox content={content} />
              <div className={`join-photo ${content.join_image ? "" : "no-photo"}`}
                style={content.join_image ? { backgroundImage: `url(${content.join_image})` } : undefined}>
                {!content.join_image && (
                  <div className="tent">
                    <div className="t-brand">{content.site_name}<small>{content.tagline}</small></div>
                    <div className="t-num">12</div>
                    <div className="t-tag">GOOD FOOD<br />GOOD MOOD</div>
                  </div>
                )}
              </div>
            </div>

            {features.length > 0 && (
              <div className="features">
                {features.map((f, idx) => (
                  <div className="feat" key={f.title}>
                    <span className="feat-ico">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                        {FEATURE_ICONS[idx % FEATURE_ICONS.length]}
                      </svg>
                    </span>
                    <div><h5>{f.title}</h5><p>{f.text}</p></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer content={content} />
    </>
  );
}
