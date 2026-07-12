"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

const fmt = (n) => n.toFixed(2);
const SESSION_KEY = "tr_portal_session";

function buildCombinedInvoice(orders) {
  const lineMap = {};
  let subtotal = 0, tax = 0, svc = 0, grand = 0, taxPct = 0, svcPct = 0;
  for (const o of orders) {
    subtotal += o.Subtotal; tax += o.TaxAmount; svc += o.ServiceAmount; grand += o.GrandTotal;
    taxPct = o.TaxPercent; svcPct = o.ServicePercent;
    for (const i of o.items) {
      const key = i.ItemName + "|" + i.UnitPrice;
      if (!lineMap[key]) lineMap[key] = { name: i.ItemName, price: i.UnitPrice, qty: 0, total: 0 };
      lineMap[key].qty += i.Quantity;
      lineMap[key].total += i.LineTotal;
    }
  }
  return { lines: Object.values(lineMap), subtotal, tax, svc, grand, taxPct, svcPct };
}

export default function PortalClient() {
  const [session, setSession] = useState(null); // { table, tableId, phone, name }
  const [loaded, setLoaded] = useState(false);
  const [mode, setMode] = useState("claim"); // "claim" | "join"
  const [tables, setTables] = useState([]);
  const [form, setForm] = useState({ tableId: "", phone: "", name: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [orders, setOrders] = useState([]);
  const [tab, setTab] = useState("orders"); // "orders" | "invoice"

  useEffect(() => {
    (async () => {
      try {
        const raw = localStorage.getItem(SESSION_KEY);
        if (raw) {
          const s = JSON.parse(raw);
          // Don't blindly trust a saved session — confirm the table is
          // still actually registered to this phone number server-side
          // (it may have been released by staff, or belong to old data).
          const res = await fetch("/api/public/tables/join", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tableId: s.tableId, phone: s.phone, name: s.name }),
          });
          if (res.ok) setSession(s);
          else localStorage.removeItem(SESSION_KEY);
        }
      } catch { /* ignore corrupt/blocked storage, just show the login form */ }
      setLoaded(true);
    })();
  }, []);

  const loadTables = async () => {
    const res = await fetch("/api/public/tables");
    const d = await res.json();
    if (res.ok) setTables(d.tables || []);
  };
  useEffect(() => {
    if (session) return;
    loadTables();
    const t = setInterval(loadTables, 5000);
    return () => clearInterval(t);
  }, [session, mode]);

  useEffect(() => {
    if (!session) return;
    const load = async () => {
      try {
        const res = await fetch(`/api/public/orders/lookup?phone=${encodeURIComponent(session.phone)}&name=${encodeURIComponent(session.name)}`);
        const data = await res.json();
        if (res.ok) setOrders(data.orders || []);
      } catch { /* transient network error, try again next tick */ }
    };
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [session]);

  const submit = async () => {
    if (!form.tableId) return setErr("Please select a table.");
    if (!/^[\d+\-\s()]{7,}$/.test(form.phone)) return setErr("Please enter a valid phone number.");
    if (!form.name.trim()) return setErr("Please enter your name.");
    setErr(""); setBusy(true);
    const url = mode === "claim" ? "/api/public/tables/claim" : "/api/public/tables/join";
    const res = await fetch(url, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tableId: form.tableId, phone: form.phone.trim(), name: form.name.trim() }),
    });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) { setErr(d.error); if (mode === "claim") loadTables(); return; }
    const table = tables.find(t => t.TableId === +form.tableId);
    const s = { table: table?.Name || "", tableId: form.tableId, phone: form.phone.trim(), name: form.name.trim() };
    localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    setSession(s);
  };

  const logout = () => {
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
    setOrders([]);
    setForm({ tableId: "", phone: "", name: "" });
    setErr("");
  };

  if (!loaded) return null;

  if (!session) {
    const freeTables = tables.filter(t => !t.Occupied);
    const occupiedTables = tables.filter(t => t.Occupied);
    return (
      <div className="card" style={{ maxWidth: 440 }}>
        <div className="steps" style={{ marginBottom: "1.2rem" }}>
          <button className={`step-dot ${mode === "claim" ? "on" : ""}`} style={{ border: "none", cursor: "pointer" }}
            onClick={() => { setMode("claim"); setForm({ tableId: "", phone: "", name: "" }); setErr(""); }}>New Table</button>
          <button className={`step-dot ${mode === "join" ? "on" : ""}`} style={{ border: "none", cursor: "pointer" }}
            onClick={() => { setMode("join"); setForm({ tableId: "", phone: "", name: "" }); setErr(""); }}>Join Someone's Table</button>
        </div>

        {mode === "claim" ? (
          <p style={{ marginBottom: "1rem" }}>Pick your table and register with your phone number to start ordering.</p>
        ) : (
          <p style={{ marginBottom: "1rem" }}>Already seated with someone who registered the table? Enter the table and the phone number <em>they</em> used to join them.</p>
        )}
        {err && <p className="err" role="alert">{err}</p>}

        <div className="field">
          <label htmlFor="pt-table">Table</label>
          <select id="pt-table" value={form.tableId} onChange={e => setForm({ ...form, tableId: e.target.value })}>
            <option value="">Select a table…</option>
            {mode === "claim"
              ? freeTables.map(t => <option key={t.TableId} value={t.TableId}>{t.Name}</option>)
              : occupiedTables.map(t => <option key={t.TableId} value={t.TableId}>{t.Name}{t.OccupiedName ? ` — registered by ${t.OccupiedName}` : ""}</option>)}
          </select>
          {mode === "claim" && freeTables.length === 0 && <p style={{ fontSize: ".8rem", opacity: .7, marginTop: ".3rem" }}>No free tables right now — if you're joining someone already seated, use "Join Someone's Table" above.</p>}
          {mode === "join" && occupiedTables.length === 0 && <p style={{ fontSize: ".8rem", opacity: .7, marginTop: ".3rem" }}>No tables are currently registered yet. If someone at your table just registered, tap Refresh below.</p>}
          <button type="button" className="btn small ghost" style={{ marginTop: ".4rem" }} onClick={loadTables}>Refresh Table List</button>
        </div>
        <div className="field">
          <label htmlFor="pt-name">Your Name</label>
          <input id="pt-name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="pt-phone">{mode === "claim" ? "Phone Number" : "The Table's Registered Phone Number"}</label>
          <input id="pt-phone" type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
            onKeyDown={e => e.key === "Enter" && submit()} />
        </div>
        <button className="btn" onClick={submit} disabled={busy}>{busy ? "Checking…" : mode === "claim" ? "Register Table" : "Join Table"}</button>
      </div>
    );
  }

  const orderMoreHref = `/order?table=${encodeURIComponent(session.table)}&name=${encodeURIComponent(session.name)}&phone=${encodeURIComponent(session.phone)}`;

  return (
    <div>
      <div className="card" style={{ marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <p style={{ fontWeight: 600 }}>Welcome, {session.name} · Table {session.table}</p>
          <p style={{ fontSize: ".82rem", opacity: .7 }}>{session.phone}</p>
        </div>
        <div style={{ display: "flex", gap: ".7rem" }}>
          <Link href={orderMoreHref} className="btn">Start New Order</Link>
          <button className="btn ghost small" onClick={logout}>Not you? Switch table</button>
        </div>
      </div>
      <p style={{ fontSize: ".82rem", opacity: .7, marginBottom: "1.2rem" }}>
        Others at Table {session.table}? They can order separately too — at <strong>/portal</strong>, choose "Join Someone's Table," pick Table {session.table}, and enter this phone number: <strong>{session.phone}</strong>.
      </p>

      <div className="steps" style={{ marginBottom: "1.2rem" }}>
        <button className={`step-dot ${tab === "orders" ? "on" : ""}`} style={{ border: "none", cursor: "pointer" }} onClick={() => setTab("orders")}>Today's Orders</button>
        <button className={`step-dot ${tab === "invoice" ? "on" : ""}`} style={{ border: "none", cursor: "pointer" }} onClick={() => setTab("invoice")}>Total Invoice</button>
      </div>

      {tab === "orders" && (
        <>
          {orders.length === 0 && <p>No orders yet today — tap "Start New Order" above to place your first one.</p>}
          {orders.map(o => (
            <div className="card" key={o.OrderId} style={{ marginBottom: "1.2rem" }}>
              <p>Order <strong>{o.OrderNumber}</strong> · Table {o.TableNumber} · {new Date(o.CreatedAt).toLocaleTimeString()} ·{" "}
                <span className={`status-pill st-${o.Status}`}>{o.Status}</span>
              </p>
              <ul style={{ margin: ".6rem 0", paddingLeft: "1.1rem", fontSize: ".9rem" }}>
                {o.items.map(i => <li key={i.OrderDetailId}>{i.Quantity}× {i.ItemName} @ {fmt(i.UnitPrice)} — {fmt(i.LineTotal)}</li>)}
              </ul>
              <p style={{ fontWeight: 600 }}>Subtotal: {fmt(o.Subtotal)}</p>
              <p style={{ fontSize: ".78rem", opacity: .65, marginBottom: ".6rem" }}>Tax &amp; service are applied once on the combined Total Invoice tab, not per order.</p>
              <Link href={`/order/confirm/${o.OrderNumber}`} className="btn small ghost">View Full Invoice</Link>
            </div>
          ))}
        </>
      )}

      {tab === "invoice" && (() => {
        if (orders.length === 0) return <p>No orders yet today.</p>;
        const inv = buildCombinedInvoice(orders);
        return (
          <div className="card" style={{ maxWidth: 560 }}>
            <p style={{ fontSize: ".82rem", opacity: .7, marginBottom: ".8rem" }}>Combined across {orders.length} order{orders.length > 1 ? "s" : ""} placed today by {session.name} at Table {session.table}.</p>
            <table className="inv">
              <thead><tr><th>Item</th><th>Qty</th><th className="num">Unit Price</th><th className="num">Total</th></tr></thead>
              <tbody>{inv.lines.map(l => (
                <tr key={l.name + l.price}><td>{l.name}</td><td>{l.qty}</td><td className="num">{fmt(l.price)}</td><td className="num">{fmt(l.total)}</td></tr>
              ))}</tbody>
            </table>
            <div className="totals">
              <div className="row"><span>Subtotal</span><span>{fmt(inv.subtotal)}</span></div>
              <div className="row"><span>Tax ({inv.taxPct}%)</span><span>{fmt(inv.tax)}</span></div>
              <div className="row"><span>Service ({inv.svcPct}%)</span><span>{fmt(inv.svc)}</span></div>
              <div className="row grand"><span>Grand Total</span><span>{fmt(inv.grand)}</span></div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
