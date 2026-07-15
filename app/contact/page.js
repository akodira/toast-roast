import { Header, Footer, getContent } from "@/components/SiteChrome";
import Link from "next/link";
export const dynamic = "force-dynamic";
export const metadata = { title: "Contact Us — Toast & Roast" };

function Ic({ kind }) {
  const p = { width: 17, height: 17, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };
  if (kind === "pin") return <svg {...p}><path d="M12 21s7-5.5 7-11a7 7 0 0 0-14 0c0 5.5 7 11 7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>;
  if (kind === "phone") return <svg {...p}><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" /></svg>;
  if (kind === "mail") return <svg {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></svg>;
  return <svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
}
function TableIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 9h18" /><path d="M5 9v11" /><path d="M19 9v11" /><path d="M12 9v4" /><path d="M8 13h8" /></svg>;
}

/* Turn whatever the admin pasted into a usable iframe src — OR null.
 *
 * The "www.google.com refused to connect" error happens when a normal Maps
 * link (google.com/maps/place/…) is put in an iframe: Google blocks those
 * with X-Frame-Options. Only the embed URL (google.com/maps/embed?pb=…)
 * is allowed to be framed. Most people copy the whole <iframe …> snippet
 * from Maps → Share → Embed, so we also pull the src= out of that.
 * Anything that isn't a real embed URL returns null, and the page shows an
 * "Open in Maps" link instead of a broken frame. */
function resolveEmbedSrc(raw) {
  const v = (raw || "").trim();
  if (!v) return null;
  // Pasted the full <iframe ... src="..."> snippet → extract the src.
  const m = v.match(/src=["']([^"']+)["']/i);
  const url = m ? m[1] : v;
  // Only allow Google's actual embed endpoint — never a normal maps page.
  return /\/maps\/embed/i.test(url) ? url : null;
}

export default async function Contact() {
  const content = await getContent();
  const rows = [
    { k: "pin", label: "Address", val: content.contact_address, extra: content.map_url ? <a href={content.map_url} target="_blank" rel="noopener noreferrer" className="ct-maplink">View on Map →</a> : null },
    { k: "phone", label: "Phone", val: content.contact_phone },
    { k: "mail", label: "Email", val: content.contact_email },
    { k: "clock", label: "Opening Hours", val: content.opening_hours },
  ];
  const embedSrc = resolveEmbedSrc(content.map_embed);
  const hasMap = !!embedSrc || !!content.map_url?.trim();

  return (
    <>
      <Header content={content} />
      <main className="ct-page">
        <div className="container">
          <div className="ct-grid">

            <div className="ct-copy">
              <span className="eyebrow-mark">Get In Touch</span>
              <h1 className="story-title">{content.contact_title || "Contact Us"}</h1>
              <span className="rule-diamond" aria-hidden="true"></span>
              <p className="ct-lead">{content.contact_lead || "We'd love to hear from you. Reach out to us for reservations, feedback, or any inquiries."}</p>

              <div className="ct-card">
                {rows.map((r, i) => (
                  <div className="ct-row" key={i}>
                    <span className="ct-ic"><Ic kind={r.k} /></span>
                    <span className="ct-row-body">
                      <span className="ct-row-label">{r.label}</span>
                      <span className="ct-row-val">{r.val}</span>
                    </span>
                    {r.extra && <span className="ct-row-extra">{r.extra}</span>}
                  </div>
                ))}
              </div>
            </div>

            <div className="ct-map">
              {embedSrc
                ? <iframe src={embedSrc} title="Map" loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen></iframe>
                : content.map_url?.trim()
                  ? <a className="ct-map-link" href={content.map_url} target="_blank" rel="noopener noreferrer"><span className="ct-map-pin"><Ic kind="pin" /></span><span>Open in Maps →</span></a>
                  : <div className="ct-map-empty"><Ic kind="pin" /><span>Map coming soon</span></div>}
            </div>

            <div className="ct-visit">
              {content.contact_photo
                ? <div className="ct-visit-photo"><img src={content.contact_photo} alt="Our place" /></div>
                : <div className="ct-visit-photo no-photo"><Ic kind="pin" /></div>}
              <div className="ct-visit-card">
                <span className="ct-visit-title">{content.visit_title || "Visit Us"}</span>
                <span className="rule-diamond" aria-hidden="true"></span>
                <p className="ct-visit-text">{content.visit_text || "Enjoy our cozy atmosphere, great coffee, and delicious food. We can't wait to welcome you!"}</p>
                <Link href="/portal" className="ct-visit-cta"><TableIcon /> Join a Table</Link>
              </div>
            </div>

          </div>
        </div>
      </main>
      <Footer content={content} />
    </>
  );
}
