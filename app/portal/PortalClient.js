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

export default function PortalClient({ tables }) {
  const [session, setSession] = useState(null); // { table, phone, name, email }
  const [loaded, setLoaded] = useState(false);
  const [form, setForm] = useState({ table: "", phone: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [orders, setOrders] = useState([]);
  const [tab, setTab] = useState("orders"); // "orders" | "invoice"

  // Load any existing session from this device on first render.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) setSession(JSON.parse(raw));
    } catch { /* ignore corrupt/blocked storage, just show the login form */ }
    setLoaded(true);
  }, []);

  // While "logged in", pull today's orders for this phone and keep them fresh.
  useEffect(() => {
    if (!session) return;
    const load = async () => {
      try {
        const res = await fetch(`/api/public/orders/lookup?phone=${encodeURIComponent(session.phone)}`);
        const data = await res.json();
        if (res.ok) setOrders(data.orders || []);
      } catch { /* transient network error, try again next tick */ }
    };
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [session]);

  const login = async () => {
    if (!form.table) return setErr("Please select your table.");
    if (!/^[\d+\-\s()]{7,}$/.test(form.phone)) return setErr("Please enter a valid phone number.");
    setErr(""); setBusy(true);
    // Recognize a returning customer today (by phone) and prefill their name/email.
    let name = "", email = "";
    try {
      const res = await fetch(`/api/public/orders/lookup?phone=${encodeURIComponent(form.phone)}`);
      const data = await res.json();
      if (res.ok && data.orders?.[0]) { name = data.orders[0].CustomerName || ""; email = data.orders[0].Email || ""; }
    } catch { /* fine, they'll just enter their name fresh in the order form */ }
    const s = { table: form.table, phone: form.phone.trim(), name, email };
    localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    setSession(s);
    setBusy(false);
  };

  const logout = () => {
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
    setOrders([]);
    setForm({ table: "", phone: "" });
  };

  if (!loaded) return null;

  if (!session) {
    return (
      <div className="card" style={{ maxWidth: 420 }}>
        <p style={{ marginBottom: "1rem" }}>Enter your table and phone number to start ordering, or to check on an order you already placed.</p>
        {err && <p className="err" role="alert">{err}</p>}
        <div className="field">
          <label htmlFor="pt-table">Table</label>
          <select id="pt-table" value={form.table} onChange={e => setForm({ ...form, table: e.target.value })}>
            <option value="">Select your table…</option>
            {tables.map(t => <option key={t.TableId} value={t.Name}>{t.Name}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="pt-phone">Phone Number</label>
          <input id="pt-phone" type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
            onKeyDown={e => e.key === "Enter" && login()} />
        </div>
        <button className="btn" onClick={login} disabled={busy}>{busy ? "Checking…" : "Continue"}</button>
      </div>
    );
  }

  const orderMoreHref = `/order?table=${encodeURIComponent(session.table)}&name=${encodeURIComponent(session.name || "")}&email=${encodeURIComponent(session.email || "")}&phone=${encodeURIComponent(session.phone)}`;

  return (
    <div>
      <div className="card" style={{ marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <p style={{ fontWeight: 600 }}>{session.name ? `Welcome back, ${session.name}` : "Welcome"} · Table {session.table}</p>
          <p style={{ fontSize: ".82rem", opacity: .7 }}>{session.phone}</p>
        </div>
        <div style={{ display: "flex", gap: ".7rem" }}>
          <Link href={orderMoreHref} className="btn">Start New Order</Link>
          <button className="btn ghost small" onClick={logout}>Not you? Switch table</button>
        </div>
      </div>

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
            <p style={{ fontSize: ".82rem", opacity: .7, marginBottom: ".8rem" }}>Combined across {orders.length} order{orders.length > 1 ? "s" : ""} placed today at Table {session.table}.</p>
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
