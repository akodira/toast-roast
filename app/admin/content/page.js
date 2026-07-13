"use client";
import { useEffect, useState } from "react";
import AdminShell from "../AdminShell";

const FIELDS = [
  ["site_name","Site Name","input"],["tagline","Tagline","input"],
  ["hero_title","Home Hero Title (HTML allowed: <i>italic</i> for emphasis)","textarea"],
  ["hero_subtitle","Home Hero Subtitle (HTML allowed: <b>bold</b>, <i>italic</i>)","textarea"],
  ["house_favourites_title","\"House Favourites\" Section Title","input"],
  ["cuisine_title","\"Explore the Cuisine\" Section Title (HTML allowed for italics)","input"],
  ["about_html","About Us (HTML allowed)","textarea"],
  ["contact_address","Address","input"],
  ["map_url","Google Maps Link (shown under Address)","input"],
  ["contact_phone","Phone","input"],["contact_email","Email","input"],
  ["opening_hours","Opening Hours","input"],
  ["facebook_url","Facebook URL","input"],["instagram_url","Instagram URL","input"],
  ["footer_note","Footer Note (HTML allowed: <b>bold</b>, <i>italic</i>)","input"],
];

const IMAGE_FIELDS = [
  ["hero_image_1", "Hero Photo — Front", "Larger, foreground image in the homepage hero."],
  ["hero_image_2", "Hero Photo — Back", "Smaller image peeking out behind the front one. Optional."],
  ["favourites_image", "House Favourites Photo", "Tall photo (portrait) next to the House Favourites list."],
  ["cuisine_image", "Explore the Cuisine Photo", "Photo next to the category grid near the bottom of the homepage."],
];

const HEADING_FONTS = ["Playfair Display", "Prata", "Merriweather", "Cormorant Garamond", "Lora"];
const BODY_FONTS = ["Inter", "Poppins", "Lato", "Nunito Sans", "Work Sans"];

export default function ContentPage() {
  const [c, setC] = useState(null);
  const [msg, setMsg] = useState("");

  useEffect(() => { fetch("/api/admin/content").then(r => r.json()).then(d => setC(d.content)); }, []);

  const save = async () => {
    const res = await fetch("/api/admin/content", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(c) });
    setMsg(res.ok ? "Saved — changes are live on the website immediately." : "Save failed.");
  };

  const upload = async (key, file) => {
    const fd = new FormData(); fd.append("file", file);
    const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
    const d = await res.json();
    if (!res.ok) return setMsg(d.error);
    const next = { ...c, [key]: d.url };
    setC(next);
    // Save this field immediately so a photo upload is never lost.
    await fetch("/api/admin/content", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [key]: d.url }) });
    setMsg("Photo uploaded and saved.");
  };

  const removeImage = async (key) => {
    setC({ ...c, [key]: "" });
    await fetch("/api/admin/content", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [key]: "" }) });
    setMsg("Photo removed.");
  };

  if (!c) return <AdminShell><p>Loading…</p></AdminShell>;

  return (
    <AdminShell>
      <h1>Website Content</h1>

      <div className="card" style={{ maxWidth: 640, marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1rem", marginBottom: ".8rem" }}>Colors & Fonts</h2>
        <div className="field">
          <label>Primary Color (buttons, headings, accents)</label>
          <input type="color" value={c.theme_primary_color || "#C0502A"} onChange={e => setC({ ...c, theme_primary_color: e.target.value })} style={{ height: 44, padding: 4 }} />
        </div>
        <div className="field">
          <label>Heading Font</label>
          <select value={c.theme_font_heading || "Playfair Display"} onChange={e => setC({ ...c, theme_font_heading: e.target.value })}>
            {HEADING_FONTS.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Body Text Font</label>
          <select value={c.theme_font_body || "Inter"} onChange={e => setC({ ...c, theme_font_body: e.target.value })}>
            {BODY_FONTS.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 640, marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1rem", marginBottom: ".8rem" }}>Invoice / Receipt Branding</h2>
        <p style={{ fontSize: ".8rem", opacity: .7, marginBottom: "1rem" }}>Shown at the top of every printed/downloaded invoice in Admin → Invoices.</p>
        <div className="field">
          <label>Logo</label>
          <p style={{ fontSize: ".76rem", opacity: .65, marginBottom: ".3rem" }}>If left empty, the invoice shows your Site Name as text instead.</p>
          <input type="file" accept="image/*" onChange={e => e.target.files[0] && upload("invoice_logo", e.target.files[0])} />
          {c.invoice_logo && <img src={c.invoice_logo} alt="" style={{ height: 60, marginTop: ".5rem", borderRadius: 4 }} />}
          {c.invoice_logo && <div><button className="btn small ghost" style={{ marginTop: ".4rem" }} onClick={() => removeImage("invoice_logo")}>Remove Logo</button></div>}
        </div>
        <div className="field"><label>Branch / Location Line</label>
          <input value={c.invoice_branch_line || ""} onChange={e => setC({ ...c, invoice_branch_line: e.target.value })} /></div>
        <div className="field"><label>Footer Note (e.g. "Thank you for dining with us")</label>
          <input value={c.invoice_footer_note || ""} onChange={e => setC({ ...c, invoice_footer_note: e.target.value })} /></div>
        <button className="btn" onClick={save}>Save Invoice Branding</button>
      </div>

      <div className="card" style={{ maxWidth: 640, marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1rem", marginBottom: ".8rem" }}>Homepage Photos</h2>
        <p style={{ fontSize: ".8rem", opacity: .7, marginBottom: "1rem" }}>Landscape or portrait photos work best depending on the slot — leave any of these empty and that section falls back to a plain background, nothing breaks.</p>
        {IMAGE_FIELDS.map(([key, label, hint]) => (
          <div className="field" key={key}>
            <label>{label}</label>
            <p style={{ fontSize: ".76rem", opacity: .65, marginBottom: ".3rem" }}>{hint}</p>
            <input type="file" accept="image/*" onChange={e => e.target.files[0] && upload(key, e.target.files[0])} />
            {c[key] && <img src={c[key]} alt="" style={{ width: 140, marginTop: ".5rem", borderRadius: 4 }} />}
            {c[key] && <div><button className="btn small ghost" style={{ marginTop: ".4rem" }} onClick={() => removeImage(key)}>Remove Photo</button></div>}
          </div>
        ))}
      </div>

      <div className="card" style={{ maxWidth: 640 }}>
        <h2 style={{ fontSize: "1rem", marginBottom: ".8rem" }}>Text Content</h2>
        {msg && <p className="ok-msg">{msg}</p>}
        {FIELDS.map(([k, label, kind]) => (
          <div className="field" key={k}>
            <label>{label}</label>
            {kind === "textarea"
              ? <textarea value={c[k] || ""} onChange={e => setC({ ...c, [k]: e.target.value })} />
              : <input value={c[k] || ""} onChange={e => setC({ ...c, [k]: e.target.value })} />}
          </div>
        ))}
        <button className="btn" onClick={save}>Save All Content</button>
      </div>
    </AdminShell>
  );
}
