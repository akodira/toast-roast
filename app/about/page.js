import { Header, Footer, getContent } from "@/components/SiteChrome";
export const dynamic = "force-dynamic";
export const metadata = { title: "About Us — Toast & Roast" };

/* The three story cards and four feature chips are admin-editable via new
   content keys (story_1_* , about_feat_*). Until those rows exist in the DB,
   these defaults render so the page never looks empty on first deploy. */
const STORY_FALLBACK = [
  { title: "The Grill", tag: "Premium cuts, grilled to perfection.", img: "" },
  { title: "The Roastery", tag: "Expertly roasted beans, brewed with care.", img: "" },
  { title: "The Sweet Finish", tag: "End your meal with something sweet.", img: "" },
];
const FEAT_FALLBACK = [
  ["Quality Ingredients", "utensils"],
  ["Grilled To Perfection", "flame"],
  ["Specialty Coffee", "cup"],
  ["Made With Passion", "heart"],
];

function FeatIcon({ kind }) {
  const p = { width: 26, height: 26, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };
  if (kind === "flame") return <svg {...p}><path d="M12 3c1 3 4 4 4 8a4 4 0 0 1-8 0c0-2 1-3 2-4 0 1 1 2 2 2 0-2-2-4-2-6z" /></svg>;
  if (kind === "cup") return <svg {...p}><path d="M17 8h1a3 3 0 0 1 0 6h-1" /><path d="M4 8h13v7a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z" /><path d="M7 2v2M11 2v2" /></svg>;
  if (kind === "heart") return <svg {...p}><path d="M12 20s-7-4.5-9-9a4.5 4.5 0 0 1 9-2 4.5 4.5 0 0 1 9 2c-2 4.5-9 9-9 9z" /></svg>;
  return <svg {...p}><path d="M6 3v7a2 2 0 0 0 4 0V3M8 10v11" /><path d="M16 3c-1.5 0-2.5 2-2.5 5S15 12 16 12s2.5.5 2.5-4S17.5 3 16 3z" /><path d="M16 12v9" /></svg>;
}

export default async function About() {
  const content = await getContent();
  const story = STORY_FALLBACK.map((d, i) => ({
    title: content[`story_${i + 1}_title`] || d.title,
    tag: content[`story_${i + 1}_tag`] || d.tag,
    img: content[`story_${i + 1}_image`] || d.img,
  }));
  const feats = FEAT_FALLBACK.map(([label, icon], i) => ({
    label: content[`about_feat_${i + 1}`] || label,
    icon,
  }));

  return (
    <>
      <Header content={content} />
      <main className="story-page">
        <div className="container">
          <div className="story-grid">

            <div className="story-copy">
              <span className="eyebrow-mark">Our Story</span>
              <h1 className="story-title">{content.about_title || "About Toast & Roast"}</h1>
              <span className="rule-diamond" aria-hidden="true"></span>
              <div className="story-body" dangerouslySetInnerHTML={{ __html: content.about_html || "" }} />

              <div className="story-feats">
                {feats.map((f, i) => (
                  <div className="story-feat" key={i}>
                    <span className="story-feat-ic"><FeatIcon kind={f.icon} /></span>
                    <span className="story-feat-lbl">{f.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="story-cards">
              {story.map((s, i) => (
                <div className={`story-card${s.img ? "" : " no-photo"}`} key={i}>
                  {s.img && <img src={s.img} alt={s.title} />}
                  <div className="story-card-veil" aria-hidden="true"></div>
                  <div className="story-card-txt">
                    <span className="story-card-title">{s.title}</span>
                    <span className="story-card-line" aria-hidden="true"></span>
                    <span className="story-card-tag">{s.tag}</span>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      </main>
      <Footer content={content} />
    </>
  );
}
