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
    await fetch("/api/admin/content", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [key]: d.url }) });
    setMsg("Photo uploaded and saved.");
  };

  const removeImage = async (key) => {
    setC(prev => ({ ...prev, [key]: "" }));
    await fetch("/api/admin/content", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [key]: "" }) });
    setMsg("Photo removed.");
  };

  if (!c) return <AdminShell><p>Loading…</p></AdminShell>;

  const set = (k, v) => setC(prev => ({ ...prev, [k]: v }));

  // NOTE: these are plain functions returning JSX, NOT components. Defining a
  // component inside render remounts it every keystroke (focus is lost after
  // one letter). Calling a function that returns elements keeps the same
  // <input> instance mounted, so typing works normally.
  const textField = (k, label, { hint, area } = {}) => (
    <div className="field" key={k}>
      <label>{label}</label>
      {hint && <p className="fld-hint">{hint}</p>}
      {area
        ? <textarea value={c[k] || ""} onChange={e => set(k, e.target.value)} />
        : <input value={c[k] || ""} onChange={e => set(k, e.target.value)} />}
    </div>
  );
  const photoField = (k, label, hint) => (
    <div className="field" key={k}>
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

      <div className="card" style={card}>
        <h2 style={h}>Brand &amp; Logo</h2>
        <p style={sub}>Your name, tagline and logo — shown in the header and footer across every page.</p>
        {textField("site_name", "Site Name")}
        {textField("tagline", "Tagline (under the logo)")}
        {photoField("site_logo", "Logo", "Square works best. Leave empty for the cup icon.")}
        <button className="btn" onClick={() => save()}>Save Brand</button>
      </div>

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

      <div className="card" style={card}>
        <h2 style={h}>Homepage — Hero</h2>
        <p style={sub}>The big headline area at the top of the homepage.</p>
        {textField("hero_title", "Hero Title", { hint: "Wrap the second line in <i>…</i> to colour it.", area: true })}
        {textField("hero_subtitle", "Hero Subtitle", { area: true })}
        {photoField("hero_image", "Hero Background Photo", "Landscape, 1600px+ wide. A dark scrim is applied automatically so text stays readable.")}
        <button className="btn" onClick={() => save()}>Save Hero</button>
      </div>

      <div className="card" style={card}>
        <h2 style={h}>Homepage — Section Titles</h2>
        <p style={sub}>The headings for the main blocks on the homepage.</p>
        {textField("popular_title", '"Popular Items" Section Title')}
        {textField("menu_title", '"Our Menu" Section Title')}
        <button className="btn" onClick={() => save()}>Save Section Titles</button>
      </div>

      <div className="card" style={card}>
        <h2 style={h}>Homepage — Join Your Table</h2>
        <p style={sub}>The phone-number box section on the homepage.</p>
        {textField("join_title", "Section Title")}
        {textField("join_text", "Description", { area: true })}
        {photoField("join_image", "Photo", "Beside the phone-number box. Leave empty to show the table-tent card instead.")}
        <button className="btn" onClick={() => save()}>Save Join Your Table</button>
      </div>

      <div className="card" style={card}>
        <h2 style={h}>Homepage — Feature Strip</h2>
        <p style={sub}>The four points near the bottom of the homepage. Clear a title to hide that one.</p>
        {[1, 2, 3, 4].map(n => (
          <div key={n} style={{ marginBottom: "1rem", paddingBottom: ".6rem", borderBottom: "1px solid var(--line)" }}>
            {textField(`feature_${n}_title`, `Feature ${n} — Title`)}
            {textField(`feature_${n}_text`, `Feature ${n} — Text`)}
          </div>
        ))}
        <button className="btn" onClick={() => save()}>Save Feature Strip</button>
      </div>

      <div className="card" style={card}>
        <h2 style={h}>About Us Page</h2>
        <p style={sub}>Everything on the About page — title, story text, the three photo cards, and the feature chips.</p>
        {textField("about_title", "Page Title")}
        {textField("about_html", "Story Text (HTML allowed)", { area: true })}
        <div className="admin-subhead">Story Cards</div>
        {[1, 2, 3].map(n => (
          <div key={n} style={{ marginBottom: "1rem", paddingBottom: ".8rem", borderBottom: "1px solid var(--line)" }}>
            {textField(`story_${n}_title`, `Card ${n} — Title`)}
            {textField(`story_${n}_tag`, `Card ${n} — Caption`)}
            {photoField(`story_${n}_image`, `Card ${n} — Photo`, "Portrait works best. Leave empty for a dark panel.")}
          </div>
        ))}
        <div className="admin-subhead">Feature Chips</div>
        {[1, 2, 3, 4].map(n => textField(`about_feat_${n}`, `Feature ${n} Label`))}
        <button className="btn" onClick={() => save()}>Save About Page</button>
      </div>

      <div className="card" style={card}>
        <h2 style={h}>Contact Us Page</h2>
        <p style={sub}>Title, intro, your contact details, the map, and the &quot;Visit Us&quot; card.</p>
        {textField("contact_title", "Page Title")}
        {textField("contact_lead", "Intro Text", { area: true })}
        <div className="admin-subhead">Contact Details</div>
        {textField("contact_address", "Address")}
        {textField("contact_phone", "Phone")}
        {textField("contact_email", "Email")}
        {textField("opening_hours", "Opening Hours")}
        <div className="admin-subhead">Map</div>
        {textField("map_url", "Map Link (Google Maps URL)", { hint: 'Used for the "View on Map" / "Open in Maps" link.' })}
        {textField("map_embed", "Embedded Map", { area: true, hint: 'In Google Maps: Share → Embed a map → Copy HTML, and paste the whole snippet OR just the src="…" link here. A normal maps link won\'t embed — it must be the embed code.' })}
        <div className="admin-subhead">Visit Us Card</div>
        {textField("visit_title", '"Visit Us" Title')}
        {textField("visit_text", '"Visit Us" Text', { area: true })}
        {photoField("contact_photo", '"Visit Us" Photo', "Shown beside the Visit Us card. Leave empty for a dark panel.")}
        <button className="btn" onClick={() => save()}>Save Contact Page</button>
      </div>

      <div className="card" style={card}>
        <h2 style={h}>Menu Page — Downloadable PDF</h2>
        <p style={sub}>Upload a PDF and a <strong>Download Menu (PDF)</strong> button appears at the top of the Menu page. Remove it and the button disappears. Max 15 MB.</p>
        <div className="field">
          <input type="file" accept="application/pdf" onChange={e => e.target.files[0] && upload("menu_pdf", e.target.files[0])} />
          {c.menu_pdf && <p style={{ marginTop: ".6rem" }}><a href={c.menu_pdf} target="_blank" rel="noopener noreferrer" style={{ color: "var(--rust-deep)", fontWeight: 600 }}>View current menu PDF →</a></p>}
          {c.menu_pdf && <div><button className="btn small ghost" style={{ marginTop: ".5rem" }} onClick={() => removeImage("menu_pdf")}>Remove PDF</button></div>}
        </div>
      </div>

      <div className="card" style={card}>
        <h2 style={h}>Invoice / Receipt Branding</h2>
        <p style={sub}>Shown at the top of every printed/downloaded invoice in Admin → Invoices.</p>
        {photoField("invoice_logo", "Invoice Logo", "If empty, the invoice shows your Site Name as text instead.")}
        {textField("invoice_branch_line", "Branch / Location Line")}
        {textField("invoice_footer_note", 'Footer Note (e.g. "Thank you for dining with us")')}
        <button className="btn" onClick={() => save()}>Save Invoice Branding</button>
      </div>

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
        {textField("footer_note", "Footer Note (HTML allowed: <b>bold</b>, <i>italic</i>)")}
        <button className="btn" onClick={() => save()}>Save Social &amp; Footer</button>
      </div>

    </AdminShell>
  );
}
