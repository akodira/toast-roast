"use client";
import { useEffect, useState } from "react";
import AdminShell from "../AdminShell";
import { SOCIAL_LINKS } from "@/components/socials";

const HEADING_FONTS = ["Playfair Display", "Prata", "Merriweather", "Cormorant Garamond", "Lora"];
const BODY_FONTS = ["Inter", "Poppins", "Lato", "Nunito Sans", "Work Sans"];

export default function ContentPage() {
  const [c, setC] = useState(null);
  const [msg, setMsg] = useState("");

  useEffect(() => { fetch("/api/admin/content").then(r => r.json()).then(d => setC(d.content)); }, []);

  // Save the whole content object. Every section's Save button calls this —
  // fields are all in one state object, so one save persists everything, but
  // each section has its own button so editing feels self-contained.
  const save = async (note = "Saved — changes are live on the website immediately.") => {
    const res = await fetch("/api/admin/content", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(c) });
    setMsg(res.ok ? note : "Save failed.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const upload = async (key, file) => {
    const fd = new FormData(); fd.append("file", file);
    const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
    const d = await res.json();
    if (!res.ok) return setMsg(d.error);
    setC(prev => ({ ...prev, [key]: d.url }));
    // Save this field immediately so a photo upload is never lost.
    await fetch("/api/admin/content", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [key]: d.url }) });
    setMsg("Photo uploaded and saved.");
  };

  const removeImage = async (key) => {
    setC(prev => ({ ...prev, [key]: "" }));
    await fetch("/api/admin/content", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [key]: "" }) });
    setMsg("Photo removed.");
  };

  if (!c) return <AdminShell><p>Loading…</p></AdminShell>;

  // ---- small field helpers so each section stays readable ----
  const set = (k, v) => setC(prev => ({ ...prev, [k]: v }));
  const Text = ({ k, label, hint, area }) => (
    <div className="field">
      <label>{label}</label>
      {hint && <p className="fld-hint">{hint}</p>}
      {area
        ? <textarea value={c[k] || ""} onChange={e => set(k, e.target.value)} />
        : <input value={c[k] || ""} onChange={e => set(k, e.target.value)} />}
    </div>
  );
  const Photo = ({ k, label, hint }) => (
    <div className="field">
      <label>{label}</label>
      {hint && <p className="fld-hint">{hint}</p>}
      <input type="file" accept="image/*" onChange={e => e.target.files[0] && upload(k, e.target.files[0])} />
      {c[k] && <img src={c[k]} alt="" style={{ width: 140, marginTop: ".5rem", borderRadius: 4 }} />}
      {c[k] && <div><button className="btn small ghost" style={{ marginTop: ".4rem" }} onClick={() => removeImage(k)}>Remove Photo</button></div>}
    </div>
  );
  const card = { maxWidth: 680, marginBottom: "1.5rem" };
  const h = { fontSize: "1.05rem", marginBottom: ".2rem" };
  const sub = { fontSize: ".8rem", opacity: .7, marginBottom: "1rem" };

  return (
    <AdminShell>
      <h1>Website Content</h1>
      <p style={{ opacity: .75, marginBottom: "1.2rem", maxWidth: 680 }}>
        Each card below is one section of the site — its text and its photos are together, so you can edit a whole
        section in one place and hit its Save button.
      </p>
      {msg && <p className="ok-msg" style={{ maxWidth: 680 }}>{msg}</p>}

      {/* ---------------- BRAND ---------------- */}
      <div className="card" style={card}>
        <h2 style={h}>Brand &amp; Logo</h2>
        <p style={sub}>Your name, tagline and logo — shown in the header and footer across every page.</p>
        <Text k="site_name" label="Site Name" />
        <Text k="tagline" label="Tagline (under the logo)" />
        <Photo k="site_logo" label="Logo" hint="Square works best. Leave empty for the cup icon." />
        <button className="btn" onClick={() => save()}>Save Brand</button>
      </div>

      {/* ---------------- COLORS & FONTS ---------------- */}
      <div className="card" style={card}>
        <h2 style={h}>Colors &amp; Fonts</h2>
        <p style={sub}>Applies site-wide.</p>
        <div className="field">
          <label>Primary Color (buttons, headings, accents)</label>
          <input type="color" value={c.theme_primary_color || "#C0502A"} onChange={e => set("theme_primary_color", e.target.value)} style={{ height: 44, padding: 4 }} />
        </div>
        <div className="field">
          <label>Heading Font</label>
          <select value={c.theme_font_heading || "Playfair Display"} onChange={e => set("theme_font_heading", e.target.value)}>
            {HEADING_FONTS.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Body Text Font</label>
          <select value={c.theme_font_body || "Inter"} onChange={e => set("theme_font_body", e.target.value)}>
            {BODY_FONTS.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <button className="btn" onClick={() => save()}>Save Colors &amp; Fonts</button>
      </div>

      {/* ---------------- HOMEPAGE: HERO ---------------- */}
      <div className="card" style={card}>
        <h2 style={h}>Homepage — Hero</h2>
        <p style={sub}>The big headline area at the top of the homepage.</p>
        <Text k="hero_title" label="Hero Title" hint="Wrap the second line in <i>…</i> to colour it." area />
        <Text k="hero_subtitle" label="Hero Subtitle" area />
        <Photo k="hero_image" label="Hero Background Photo" hint="Landscape, 1600px+ wide. A dark scrim is applied automatically so text stays readable." />
        <button className="btn" onClick={() => save()}>Save Hero</button>
      </div>

      {/* ---------------- HOMEPAGE: SECTIONS ---------------- */}
      <div className="card" style={card}>
        <h2 style={h}>Homepage — Section Titles</h2>
        <p style={sub}>The headings for the main blocks on the homepage.</p>
        <Text k="popular_title" label="&quot;Popular Items&quot; Section Title" />
        <Text k="menu_title" label="&quot;Our Menu&quot; Section Title" />
        <button className="btn" onClick={() => save()}>Save Section Titles</button>
      </div>

      {/* ---------------- HOMEPAGE: JOIN YOUR TABLE ---------------- */}
      <div className="card" style={card}>
        <h2 style={h}>Homepage — Join Your Table</h2>
        <p style={sub}>The phone-number box section on the homepage.</p>
        <Text k="join_title" label="Section Title" />
        <Text k="join_text" label="Description" area />
        <Photo k="join_image" label="Photo" hint="Beside the phone-number box. Leave empty to show the table-tent card instead." />
        <button className="btn" onClick={() => save()}>Save Join Your Table</button>
      </div>

      {/* ---------------- HOMEPAGE: FEATURE STRIP ---------------- */}
      <div className="card" style={card}>
        <h2 style={h}>Homepage — Feature Strip</h2>
        <p style={sub}>The four points near the bottom of the homepage. Clear a title to hide that one.</p>
        {[1, 2, 3, 4].map(n => (
          <div key={n} style={{ marginBottom: "1rem", paddingBottom: ".6rem", borderBottom: "1px solid var(--line)" }}>
            <Text k={`feature_${n}_title`} label={`Feature ${n} — Title`} />
            <Text k={`feature_${n}_text`} label={`Feature ${n} — Text`} />
          </div>
        ))}
        <button className="btn" onClick={() => save()}>Save Feature Strip</button>
      </div>

      {/* ---------------- ABOUT US ---------------- */}
      <div className="card" style={card}>
        <h2 style={h}>About Us Page</h2>
        <p style={sub}>Everything on the About page — title, story text, the three photo cards, and the feature chips.</p>
        <Text k="about_title" label="Page Title" />
        <Text k="about_html" label="Story Text (HTML allowed)" area />
        <div className="admin-subhead">Story Cards</div>
        {[1, 2, 3].map(n => (
          <div key={n} style={{ marginBottom: "1rem", paddingBottom: ".8rem", borderBottom: "1px solid var(--line)" }}>
            <Text k={`story_${n}_title`} label={`Card ${n} — Title`} />
            <Text k={`story_${n}_tag`} label={`Card ${n} — Caption`} />
            <Photo k={`story_${n}_image`} label={`Card ${n} — Photo`} hint="Portrait works best. Leave empty for a dark panel." />
          </div>
        ))}
        <div className="admin-subhead">Feature Chips</div>
        {[1, 2, 3, 4].map(n => <Text key={n} k={`about_feat_${n}`} label={`Feature ${n} Label`} />)}
        <button className="btn" onClick={() => save()}>Save About Page</button>
      </div>

      {/* ---------------- CONTACT US ---------------- */}
      <div className="card" style={card}>
        <h2 style={h}>Contact Us Page</h2>
        <p style={sub}>Title, intro, your contact details, the map, and the &quot;Visit Us&quot; card.</p>
        <Text k="contact_title" label="Page Title" />
        <Text k="contact_lead" label="Intro Text" area />
        <div className="admin-subhead">Contact Details</div>
        <Text k="contact_address" label="Address" />
        <Text k="contact_phone" label="Phone" />
        <Text k="contact_email" label="Email" />
        <Text k="opening_hours" label="Opening Hours" />
        <div className="admin-subhead">Map</div>
        <Text k="map_url" label="Map Link (Google Maps URL)" hint="Used for the &quot;View on Map&quot; / &quot;Open in Maps&quot; link." />
        <Text k="map_embed" label="Embedded Map"
          hint="In Google Maps: Share → Embed a map → Copy HTML, and paste the whole snippet OR just the src=&quot;…&quot; link here. A normal maps link won't embed — it must be the embed code." area />
        <div className="admin-subhead">Visit Us Card</div>
        <Text k="visit_title" label="&quot;Visit Us&quot; Title" />
        <Text k="visit_text" label="&quot;Visit Us&quot; Text" area />
        <Photo k="contact_photo" label="&quot;Visit Us&quot; Photo" hint="Background behind the Visit Us card. Leave empty for a dark panel." />
        <button className="btn" onClick={() => save()}>Save Contact Page</button>
      </div>

      {/* ---------------- MENU PDF ---------------- */}
      <div className="card" style={card}>
        <h2 style={h}>Menu Page — Downloadable PDF</h2>
        <p style={sub}>Upload a PDF and a <strong>Download Menu (PDF)</strong> button appears at the top of the Menu page. Remove it and the button disappears. Max 15 MB.</p>
        <div className="field">
          <input type="file" accept="application/pdf" onChange={e => e.target.files[0] && upload("menu_pdf", e.target.files[0])} />
          {c.menu_pdf && <p style={{ marginTop: ".6rem" }}><a href={c.menu_pdf} target="_blank" rel="noopener noreferrer" style={{ color: "var(--rust-deep)", fontWeight: 600 }}>View current menu PDF →</a></p>}
          {c.menu_pdf && <div><button className="btn small ghost" style={{ marginTop: ".5rem" }} onClick={() => removeImage("menu_pdf")}>Remove PDF</button></div>}
        </div>
      </div>

      {/* ---------------- INVOICE BRANDING ---------------- */}
      <div className="card" style={card}>
        <h2 style={h}>Invoice / Receipt Branding</h2>
        <p style={sub}>Shown at the top of every printed/downloaded invoice in Admin → Invoices.</p>
        <Photo k="invoice_logo" label="Invoice Logo" hint="If empty, the invoice shows your Site Name as text instead." />
        <Text k="invoice_branch_line" label="Branch / Location Line" />
        <Text k="invoice_footer_note" label={'Footer Note (e.g. "Thank you for dining with us")'} />
        <button className="btn" onClick={() => save()}>Save Invoice Branding</button>
      </div>

      {/* ---------------- SOCIAL + FOOTER ---------------- */}
      <div className="card" style={card}>
        <h2 style={h}>Social Links &amp; Footer</h2>
        <p style={sub}>Paste a link and its icon appears in the footer automatically. Leave a field empty to hide that icon.</p>
        {SOCIAL_LINKS.map(({ key, label, path }) => (
          <div className="field" key={key}>
            <label style={{ display: "flex", alignItems: "center", gap: ".45rem" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d={path} /></svg>
              {label}
            </label>
            <input value={c[key] || ""} placeholder="https://…" onChange={e => set(key, e.target.value)} />
          </div>
        ))}
        <Text k="footer_note" label="Footer Note (HTML allowed: <b>bold</b>, <i>italic</i>)" />
        <button className="btn" onClick={() => save()}>Save Social &amp; Footer</button>
      </div>

    </AdminShell>
  );
}
