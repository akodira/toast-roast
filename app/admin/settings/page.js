"use client";
import { useEffect, useState } from "react";
import AdminShell from "../AdminShell";

export default function SettingsPage() {
  const [s, setS] = useState(null);
  const [msg, setMsg] = useState("");
  useEffect(() => { fetch("/api/admin/settings").then(r => r.json()).then(d => setS(d.settings)); }, []);
  const save = async () => {
    setMsg("");
    const res = await fetch("/api/admin/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(s) });
    const d = await res.json();
    setMsg(res.ok ? "Saved — new orders will use these rates automatically." : d.error);
  };
  if (!s) return <AdminShell><p>Loading…</p></AdminShell>;
  const sub = 100, tax = sub * (+s.tax_percent || 0) / 100, svc = sub * (+s.service_percent || 0) / 100;
  return (
    <AdminShell>
      <h1>Tax & Service Settings</h1>
      <div className="card" style={{ maxWidth: 440 }}>
        {msg && <p className={msg.startsWith("Saved") ? "ok-msg" : "err"}>{msg}</p>}
        <div className="field"><label>Tax Percentage (VAT %)</label>
          <input type="number" step="0.5" value={s.tax_percent} onChange={e => setS({ ...s, tax_percent: e.target.value })} /></div>
        <div className="field"><label>Service Charge Percentage (%)</label>
          <input type="number" step="0.5" value={s.service_percent} onChange={e => setS({ ...s, service_percent: e.target.value })} /></div>
        <div className="field"><label>Currency</label>
          <input value={s.currency} onChange={e => setS({ ...s, currency: e.target.value })} /></div>
        <p style={{ fontSize: ".85rem", opacity: .8, margin: ".5rem 0 1rem" }}>
          Preview: Subtotal 100.00 → Tax {tax.toFixed(2)} + Service {svc.toFixed(2)} = <strong>Grand Total {(sub + tax + svc).toFixed(2)}</strong>
        </p>
        <button className="btn" onClick={save}>Save Settings</button>
      </div>
    </AdminShell>
  );
}
