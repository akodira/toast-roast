"use client";
import { useEffect, useState } from "react";
import AdminShell from "../AdminShell";

const FIELDS = [
  ["site_name","Site Name","input"],["tagline","Tagline","input"],
  ["hero_title","Home Hero Title","input"],["hero_subtitle","Home Hero Subtitle","textarea"],
  ["about_html","About Us (HTML allowed)","textarea"],
  ["contact_address","Address","input"],
  ["map_url","Google Maps Link (shown under Address)","input"],
  ["contact_phone","Phone","input"],["contact_email","Email","input"],
  ["opening_hours","Opening Hours","input"],
  ["facebook_url","Facebook URL","input"],["instagram_url","Instagram URL","input"],
  ["footer_note","Footer Note","input"],
];

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
      <div className="card" style={{ maxWidth: 640 }}>
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
