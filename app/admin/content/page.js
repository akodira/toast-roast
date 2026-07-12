"use client";
import { useEffect, useState } from "react";
import AdminShell from "../AdminShell";

const FIELDS = [
  ["site_name","Site Name","input"],["tagline","Tagline","input"],
  ["hero_title","Home Hero Title","input"],
  ["hero_subtitle","Home Hero Subtitle (HTML allowed: <b>bold</b>, <i>italic</i>)","textarea"],
  ["house_favourites_title","\"House Favourites\" Section Title","input"],
  ["about_html","About Us (HTML allowed)","textarea"],
  ["contact_address","Address","input"],
  ["map_url","Google Maps Link (shown under Address)","input"],
  ["contact_phone","Phone","input"],["contact_email","Email","input"],
  ["opening_hours","Opening Hours","input"],
  ["facebook_url","Facebook URL","input"],["instagram_url","Instagram URL","input"],
  ["footer_note","Footer Note (HTML allowed: <b>bold</b>, <i>italic</i>)","input"],
];

const HEADING_FONTS = ["Prata", "Playfair Display", "Merriweather", "Cormorant Garamond", "Lora"];
const BODY_FONTS = ["Poppins", "Inter", "Lato", "Nunito Sans", "Work Sans"];

export default function ContentPage() {
  const [c, setC] = useState(null);
  const [msg, setMsg] = useState("");
  useEffect(() => { fetch("/api/admin/content").then(r => r.json()).then(d => setC(d.content)); }, []);
  const save = async () => {
    const res = await fetch("/api/admin/content", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(c) });
    setMsg(res.ok ? "Saved — changes are live on the website immediately." : "Save failed.");
  };
  if (!c) return <AdminShell><p>Loading…</p></AdminShell>;
  return (
    <AdminShell>
      <h1>Website Content</h1>

      <div className="card" style={{ maxWidth: 640, marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1rem", marginBottom: ".8rem" }}>Colors & Fonts</h2>
        <div className="field">
          <label>Primary Color (buttons, headings, accents)</label>
          <input type="color" value={c.theme_primary_color || "#A9502F"} onChange={e => setC({ ...c, theme_primary_color: e.target.value })} style={{ height: 44, padding: 4 }} />
        </div>
        <div className="field">
          <label>Heading Font</label>
          <select value={c.theme_font_heading || "Prata"} onChange={e => setC({ ...c, theme_font_heading: e.target.value })}>
            {HEADING_FONTS.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Body Text Font</label>
          <select value={c.theme_font_body || "Poppins"} onChange={e => setC({ ...c, theme_font_body: e.target.value })}>
            {BODY_FONTS.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
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
