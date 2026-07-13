"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

const fmt = (n) => n.toFixed(2);

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
  const [session, setSession] = useState(null); // { table, tableId, phone, name } — lives only in memory for this tab
  const [mode, setMode] = useState("claim"); // "claim" | "join"
  const [tables, setTables] = useState([]);
  const [form, setForm] = useState({ tableId: "", phone: "", name: "" });
  const [foundTable, setFoundTable] = useState(null); // result of phone lookup in join mode
  const [joiningAsNew, setJoiningAsNew] = useState(false); // true once "I'm someone else" is chosen
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [orders, setOrders] = useState([]);
  const [tab, setTab] = useState("orders"); // "orders" | "invoice"

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

  const findTable = async () => {
    if (!/^[\d+\-\s()]{7,}$/.test(form.phone)) return setErr("Please enter a valid phone number.");
    setErr(""); setBusy(true);
    const res = await fetch(`/api/public/tables/find?phone=${encodeURIComponent(form.phone.trim())}`);
    const d = await res.json();
    setBusy(false);
    if (!res.ok) { setErr(d.error); setFoundTable(null); return; }
    setFoundTable(d.table);
    setJoiningAsNew(false);
    // Pre-fill with the name already on file for this table — if you're the
    // person who registered it, this means you can just confirm and go
    // straight back to your own orders, no retyping/exact-match needed.
    // Someone else joining just edits it to their own name.
    setForm(f => ({ ...f, name: d.table.OccupiedName || "" }));
  };

  const submitClaim = async () => {
    if (!form.tableId) return setErr("Please select a table.");
    if (!/^[\d+\-\s()]{7,}$/.test(form.phone)) return setErr("Please enter a valid phone number.");
    if (!form.name.trim()) return setErr("Please enter your name.");
    setErr(""); setBusy(true);
    const res = await fetch("/api/public/tables/claim", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tableId: form.tableId, phone: form.phone.trim(), name: form.name.trim() }),
    });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) { setErr(d.error); loadTables(); return; }
    const table = tables.find(t => t.TableId === +form.tableId);
    const s = { table: table?.Name || "", tableId: form.tableId, phone: form.phone.trim(), name: form.name.trim() };
    setSession(s);
  };

  const submitJoin = async (nameOverride) => {
    if (!foundTable) return;
    const joinName = (nameOverride ?? form.name).trim();
    if (!joinName) return setErr("Please enter your name.");
    setErr(""); setBusy(true);
    const res = await fetch("/api/public/tables/join", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tableId: foundTable.TableId, phone: form.phone.trim(), name: joinName }),
    });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) { setErr(d.error); setFoundTable(null); return; }
    const s = { table: foundTable.Name, tableId: foundTable.TableId, phone: form.phone.trim(), name: joinName };
    setSession(s);
  };

  const logout = () => {
    setSession(null);
    setOrders([]);
    setForm({ tableId: "", phone: "", name: "" });
    setErr("");
  };

  if (!session) {
    const freeTables = tables.filter(t => !t.Occupied);
    return (
      <div className="card" style={{ maxWidth: 440 }}>
        <div className="steps" style={{ marginBottom: "1.2rem" }}>
          <button className={`step-dot ${mode === "claim" ? "on" : ""}`} style={{ border: "none", cursor: "pointer" }}
            onClick={() => { setMode("claim"); setForm({ tableId: "", phone: "", name: "" }); setFoundTable(null); setJoiningAsNew(false); setErr(""); }}>New Order</button>
          <button className={`step-dot ${mode === "join" ? "on" : ""}`} style={{ border: "none", cursor: "pointer" }}
            onClick={() => { setMode("join"); setForm({ tableId: "", phone: "", name: "" }); setFoundTable(null); setJoiningAsNew(false); setErr(""); }}>Join Current Table</button>
        </div>
        {err && <p className="err" role="alert">{err}</p>}

        {mode === "claim" && (
          <>
            <p style={{ marginBottom: "1rem" }}>Pick your table and register with your phone number to start ordering.</p>
            <div className="field">
              <label htmlFor="pt-table">Table</label>
              <select id="pt-table" value={form.tableId} onChange={e => setForm({ ...form, tableId: e.target.value })}>
                <option value="">Select a table…</option>
                {freeTables.map(t => <option key={t.TableId} value={t.TableId}>{t.Name}</option>)}
              </select>
              {freeTables.length === 0 && <p style={{ fontSize: ".8rem", opacity: .7, marginTop: ".3rem" }}>No free tables right now — if you're joining someone already seated, use "Join Current Table" above.</p>}
              <button type="button" className="btn small ghost" style={{ marginTop: ".4rem" }} onClick={loadTables}>Refresh</button>
            </div>
            <div className="field">
              <label htmlFor="pt-name">Your Name</label>
              <input id="pt-name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="pt-phone">Phone Number</label>
              <input id="pt-phone" type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                onKeyDown={e => e.key === "Enter" && submitClaim()} />
            </div>
            <button className="btn" onClick={submitClaim} disabled={busy}>{busy ? "Checking…" : "Register Table"}</button>
          </>
        )}

        {mode === "join" && !foundTable && (
          <>
            <p style={{ marginBottom: "1rem" }}>Already seated with someone? Enter the phone number they registered the table with — we'll find it for you.</p>
            <div className="field">
              <label htmlFor="pt-find-phone">Registered Phone Number</label>
              <input id="pt-find-phone" type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                onKeyDown={e => e.key === "Enter" && findTable()} />
            </div>
            <button className="btn" onClick={findTable} disabled={busy}>{busy ? "Searching…" : "Find My Table"}</button>
          </>
        )}

        {mode === "join" && foundTable && !joiningAsNew && (
          <>
            <p style={{ marginBottom: "1.2rem" }}>
              Found it — <strong>Table {foundTable.Name}</strong>{foundTable.OccupiedName ? `, registered by ${foundTable.OccupiedName}` : ""}. Is this you, or someone else at the table?
            </p>
            {foundTable.OccupiedName && (
              <button className="btn" style={{ display: "block", width: "100%", marginBottom: ".7rem" }}
                onClick={() => submitJoin(foundTable.OccupiedName)} disabled={busy}>
                {busy ? "Loading…" : `Continue as ${foundTable.OccupiedName} — view my orders`}
              </button>
            )}
            <button className="btn ghost" style={{ display: "block", width: "100%", marginBottom: ".7rem" }}
              onClick={() => { setForm(f => ({ ...f, name: "" })); setJoiningAsNew(true); }}>
              I'm someone else at this table
            </button>
            <button className="btn ghost" onClick={() => { setFoundTable(null); setJoiningAsNew(false); setErr(""); }}>Back</button>
          </>
        )}

        {mode === "join" && foundTable && joiningAsNew && (
          <>
            <p style={{ marginBottom: "1rem" }}>Joining <strong>Table {foundTable.Name}</strong> as a new customer — your orders will be tracked separately from {foundTable.OccupiedName || "the table's"}.</p>
            <div className="field">
              <label htmlFor="pt-join-name">Your Name</label>
              <input id="pt-join-name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                onKeyDown={e => e.key === "Enter" && submitJoin()} autoFocus />
            </div>
            <button className="btn" onClick={() => submitJoin()} disabled={busy}>{busy ? "Joining…" : "Join Table"}</button>{" "}
            <button className="btn ghost" onClick={() => setJoiningAsNew(false)}>Back</button>
          </>
        )}
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
        Others at Table {session.table}? They can order separately too — at <strong>/portal</strong>, choose "Join Current Table," enter this phone number: <strong>{session.phone}</strong>, and add their own name.
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
