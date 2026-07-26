"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

const fmt = (n) => n.toFixed(2);

function buildCombinedInvoice(orders) {
  const lineMap = {};
  let subtotal = 0, tax = 0, svc = 0, grand = 0, taxPct = 0, svcPct = 0;
  for (const o of orders) {
    if (o.Status === "Cancelled") continue; // cancelled orders never bill
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

// Group today's orders into separate invoices, one per sitting (GroupInvoiceId
// from the lookup). Each sitting keeps its own paid/unpaid status, so a paid
// earlier sitting is shown as its own paid invoice and never merged into the
// current unpaid one. Newest sitting first; unpaid before paid within the day.
function groupInvoices(orders) {
  const groups = {};
  for (const o of orders) {
    const gid = o.GroupInvoiceId ?? "none";
    if (!groups[gid]) groups[gid] = { invoiceId: o.GroupInvoiceId, isPaid: !!o.GroupIsPaid, occupiedAt: o.GroupOccupiedAt, orders: [] };
    groups[gid].orders.push(o);
  }
  return Object.values(groups)
    .map(g => ({ ...g, inv: buildCombinedInvoice(g.orders), count: g.orders.length }))
    .sort((a, b) => {
      if (a.isPaid !== b.isPaid) return a.isPaid ? 1 : -1; // unpaid first
      return new Date(b.occupiedAt || 0) - new Date(a.occupiedAt || 0); // newest first
    });
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
  const [pinShow, setPinShow] = useState(null); // { pin, table } — the one-time reveal after claiming
  const [joinPin, setJoinPin] = useState(""); // PIN typed when joining someone else's table
  // Mobile-first: after the phone is entered, look the customer up. `custLookup`
  // holds { status: "new" | "known", hint, confirmed, nameLocked }.
  const [custLookup, setCustLookup] = useState(null);

  // Handoff from the homepage "Join Your Table" box: /portal?join=<phone>
  // lands straight in the join tab with the lookup already running, so the
  // customer doesn't have to retype the number they just entered.
  const qp = useSearchParams();
  useEffect(() => {
    const j = qp.get("join");
    if (!j) return;
    setMode("join");
    setForm(f => ({ ...f, phone: j }));
    findTable(j);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Resume an existing session when arriving from the order/confirm pages.
  // We DON'T trust the URL: we re-verify with the server that this phone is
  // actually registered to a table (via /find). Only then restore the
  // session — so a hand-typed ?resume=... can't fake a session for a table
  // that isn't yours. The name is carried through for the orders lookup.
  useEffect(() => {
    if (qp.get("resume") !== "1") return;
    const phone = qp.get("phone");
    const name = qp.get("name");
    if (!phone || !name) return;
    (async () => {
      try {
        const res = await fetch(`/api/public/tables/find?phone=${encodeURIComponent(phone)}`);
        const d = await res.json();
        if (res.ok && d.table) {
          setSession({ table: d.table.Name, tableId: d.table.TableId, phone, name });
        }
      } catch { /* fall through to the normal claim/join screen */ }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const findTable = async (phoneOverride) => {
    const lookup = (phoneOverride ?? form.phone).trim();
    if (!/^[\d+\-\s()]{7,}$/.test(lookup)) return setErr("Please enter a valid phone number.");
    setErr(""); setBusy(true);
    const res = await fetch(`/api/public/tables/find?phone=${encodeURIComponent(lookup)}`);
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
    // Reveal the PIN first (one-time popup). Session starts when they tap
    // "Done" — and we keep the PIN in the in-memory session so the person who
    // registered can always re-read it in the portal header (see below). It
    // lives only in this tab's memory, exactly like the rest of the session,
    // and is never re-fetchable by phone — so it's not a lookup hole.
    setPinShow({ pin: d.pin, table: s.table, session: { ...s, pin: d.pin } });
  };

  const submitJoin = async (nameOverride) => {
    if (!foundTable) return;
    const joinName = (nameOverride ?? form.name).trim();
    if (!joinName) return setErr("Please enter your name.");
    if (!/^\d{4}$/.test(joinPin.trim())) return setErr("Enter the 4-digit table PIN.");
    setErr(""); setBusy(true);
    const res = await fetch("/api/public/tables/join", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tableId: foundTable.TableId, phone: form.phone.trim(), name: joinName, pin: joinPin.trim() }),
    });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) { setErr(d.error); return; }
    const s = { table: foundTable.Name, tableId: foundTable.TableId, phone: form.phone.trim(), name: joinName };
    setSession(s);
  };

  const logout = () => {
    setSession(null);
    setOrders([]);
    setForm({ tableId: "", phone: "", name: "" });
    setErr("");
  };

  // Mobile-first customer lookup — runs when the phone field loses focus.
  // Returns a MASKED hint for a known number (privacy); the full name is only
  // fetched after the customer taps "That's me".
  const lookupCustomer = async () => {
    const phone = form.phone.trim();
    if (!/^[\d+\-\s()]{7,}$/.test(phone)) { setCustLookup(null); return; }
    try {
      const res = await fetch("/api/public/customer-lookup", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: phone }),
      });
      const d = await res.json();
      if (d.known) {
        setCustLookup({ status: "known", hint: d.hint, confirmed: false, nameLocked: true });
        setForm(f => ({ ...f, name: "" })); // clear until confirmed
      } else {
        setCustLookup({ status: "new", confirmed: true, nameLocked: false });
      }
    } catch { setCustLookup({ status: "new", confirmed: true, nameLocked: false }); }
  };

  // "That's me" — reveal + fill the real name (locked); the tap is the consent.
  const confirmCustomer = async () => {
    try {
      const res = await fetch("/api/public/customer-lookup", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: form.phone.trim(), reveal: true }),
      });
      const d = await res.json();
      if (d.known && d.name) {
        setForm(f => ({ ...f, name: d.name }));
        setCustLookup(l => ({ ...l, confirmed: true, nameLocked: true }));
      }
    } catch { /* leave as-is; they can still type */ }
  };

  // Unlock the name to correct it (wrong name saved, or a family member).
  const editCustomerName = () => setCustLookup(l => ({ ...(l || {}), nameLocked: false, confirmed: true }));
  // "Not me" — treat as a new/different name on this number.
  const notMe = () => { setForm(f => ({ ...f, name: "" })); setCustLookup({ status: "known", confirmed: true, nameLocked: false }); };

  // Call waiter — one tap, appears in the back office by table + name.
  const [waiterMsg, setWaiterMsg] = useState("");
  const callWaiter = async () => {
    setWaiterMsg("");
    try {
      const res = await fetch("/api/public/waiter", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableName: session.table, customerName: session.name, phone: session.phone }),
      });
      setWaiterMsg(res.ok ? "A waiter has been notified — someone will be with you shortly." : "Couldn't send the request, please try again.");
    } catch { setWaiterMsg("Couldn't send the request, please try again."); }
  };

  // Service rating.
  const [ratingScore, setRatingScore] = useState(0);
  const [ratingComment, setRatingComment] = useState("");
  const [ratingDone, setRatingDone] = useState(false);
  const submitRating = async () => {
    if (!ratingScore) return;
    try {
      const res = await fetch("/api/public/rating", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableName: session.table, customerName: session.name, phone: session.phone, score: ratingScore, comment: ratingComment }),
      });
      if (res.ok) setRatingDone(true);
    } catch { /* ignore, let them retry */ }
  };

  if (!session) {
    const freeTables = tables.filter(t => !t.Occupied);
    return (
      <>
      {pinShow && <PinReveal data={pinShow} onDone={() => { const s = pinShow.session; setPinShow(null); setSession(s); }} />}
      <div className="card" style={{ maxWidth: 440 }}>
        <div className="steps" style={{ marginBottom: "1.2rem" }}>
          <button className={`step-dot ${mode === "claim" ? "on" : ""}`} style={{ border: "none", cursor: "pointer" }}
            onClick={() => { setMode("claim"); setForm({ tableId: "", phone: "", name: "" }); setFoundTable(null); setJoiningAsNew(false); setJoinPin(""); setErr(""); }}>New Order</button>
          <button className={`step-dot ${mode === "join" ? "on" : ""}`} style={{ border: "none", cursor: "pointer" }}
            onClick={() => { setMode("join"); setForm({ tableId: "", phone: "", name: "" }); setFoundTable(null); setJoiningAsNew(false); setJoinPin(""); setErr(""); }}>Join Current Table</button>
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

            {/* Mobile first — this identifies the customer. */}
            <div className="field">
              <label htmlFor="pt-phone">Phone Number</label>
              <input id="pt-phone" type="tel" value={form.phone}
                onChange={e => { setForm({ ...form, phone: e.target.value }); setCustLookup(null); }}
                onBlur={lookupCustomer}
                placeholder="e.g. 0100 123 4567" />
            </div>

            {/* Returning customer: masked hint + confirm, before revealing the name. */}
            {custLookup?.status === "known" && !custLookup.confirmed && (
              <div className="cust-welcome">
                <span>Welcome back! Is this you — <strong>{custLookup.hint}</strong>?</span>
                <div className="cust-welcome-btns">
                  <button type="button" className="btn small" onClick={confirmCustomer}>That's me</button>
                  <button type="button" className="btn small ghost" onClick={notMe}>Not me</button>
                </div>
              </div>
            )}

            {/* Name field — only after we know if they're new or confirmed. */}
            {custLookup && custLookup.confirmed && (
              <div className="field">
                <label htmlFor="pt-name">Your Name</label>
                <div className="cust-name-row">
                  <input id="pt-name" value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    disabled={custLookup.nameLocked}
                    className={custLookup.nameLocked ? "input-locked" : ""}
                    placeholder="Enter your name" />
                  {custLookup.nameLocked && (
                    <button type="button" className="btn small ghost" onClick={editCustomerName}>Edit</button>
                  )}
                </div>
                {custLookup.nameLocked && <p style={{ fontSize: ".76rem", opacity: .6, marginTop: ".3rem" }}>Saved from your last visit. Tap Edit if it's wrong.</p>}
              </div>
            )}

            <button className="btn" onClick={submitClaim} disabled={busy || !custLookup}>{busy ? "Checking…" : "Register Table"}</button>
            {!custLookup && form.phone.trim() && <p style={{ fontSize: ".78rem", opacity: .6, marginTop: ".5rem" }}>Tap outside the phone field to continue.</p>}
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
            <button className="btn" onClick={() => findTable()} disabled={busy}>{busy ? "Searching…" : "Find My Table"}</button>
          </>
        )}

        {mode === "join" && foundTable && !joiningAsNew && (
          <>
            <p style={{ marginBottom: "1.2rem" }}>
              Found it — <strong>Table {foundTable.Name}</strong>{foundTable.OccupiedName ? `, registered by ${foundTable.OccupiedName}` : ""}. Enter the table PIN to continue.
            </p>
            <div className="field">
              <label htmlFor="pt-join-pin">Table PIN</label>
              <input id="pt-join-pin" type="tel" inputMode="numeric" maxLength={4} value={joinPin}
                onChange={e => setJoinPin(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="4-digit PIN" />
            </div>
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
            <button className="btn ghost" onClick={() => { setFoundTable(null); setJoiningAsNew(false); setJoinPin(""); setErr(""); }}>Back</button>
          </>
        )}

        {mode === "join" && foundTable && joiningAsNew && (
          <>
            <p style={{ marginBottom: "1rem" }}>Joining <strong>Table {foundTable.Name}</strong> as a new customer — your orders will be tracked separately from {foundTable.OccupiedName || "the table's"}.</p>
            <div className="field">
              <label htmlFor="pt-join-name">Your Name</label>
              <input id="pt-join-name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} autoFocus />
            </div>
            <div className="field">
              <label htmlFor="pt-join-pin2">Table PIN</label>
              <input id="pt-join-pin2" type="tel" inputMode="numeric" maxLength={4} value={joinPin}
                onChange={e => setJoinPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                onKeyDown={e => e.key === "Enter" && submitJoin()} placeholder="4-digit PIN" />
            </div>
            <button className="btn" onClick={() => submitJoin()} disabled={busy}>{busy ? "Joining…" : "Join Table"}</button>{" "}
            <button className="btn ghost" onClick={() => { setJoiningAsNew(false); setJoinPin(""); }}>Back</button>
          </>
        )}
      </div>
      </>
    );
  }

  const orderMoreHref = `/order?table=${encodeURIComponent(session.table)}&name=${encodeURIComponent(session.name)}&phone=${encodeURIComponent(session.phone)}`;

  return (
    <div>
      <div className="card" style={{ marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <p style={{ fontWeight: 600 }}>Table No. {session.table} &nbsp;·&nbsp; My Name: {session.name}</p>
          <p style={{ fontSize: ".82rem", opacity: .7 }}>{session.phone}</p>
          {session.pin && (
            <p className="portal-pin" title="Share this with anyone joining your table. You'll need it for every new order.">
              Table PIN: <strong>{session.pin}</strong>
            </p>
          )}
        </div>
        <div style={{ display: "flex", gap: ".7rem", flexWrap: "wrap" }}>
          <Link href={orderMoreHref} className="btn">Start New Order</Link>
          <button className="btn ghost" onClick={callWaiter}>🔔 Call Waiter</button>
          <button className="btn ghost small" onClick={logout}>Not you? Switch table</button>
        </div>
      </div>
      {waiterMsg && <p className="ok-msg" style={{ marginTop: "-.8rem", marginBottom: "1.2rem" }}>{waiterMsg}</p>}

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
              {o.Status !== "Cancelled" && (
                <div className="otl otl-cust">
                  {[["Received", "ReceivedAt"], ["Preparing", "PreparingAt"], ["Ready", "ReadyAt"], ["Delivered", "DeliveredAt"]].map(([label, col]) => (
                    <span className={`otl-step${o[col] ? " done" : ""}`} key={col}>
                      <span className="otl-tick">{o[col] ? "✓" : ""}</span>{label}
                    </span>
                  ))}
                </div>
              )}
              <ul style={{ margin: ".6rem 0", paddingLeft: "1.1rem", fontSize: ".9rem" }}>
                {o.items.map(i => <li key={i.OrderDetailId}>{i.Quantity}× {i.ItemName} @ {fmt(i.UnitPrice)} — {fmt(i.LineTotal)}{i.Sides ? <span className="cust-item-note"> + {i.Sides}</span> : null}{i.Note ? <span className="cust-item-note"> · {i.Note}</span> : null}</li>)}
              </ul>
              <p style={{ fontWeight: 600 }}>Subtotal: {fmt(o.Subtotal)}</p>
              <p style={{ fontSize: ".78rem", opacity: .65, marginBottom: ".6rem" }}>Tax &amp; service are applied once on the combined Total Invoice tab, not per order.</p>
              <Link href={`/order/confirm/${o.OrderNumber}`} className="btn small ghost">View Full Invoice</Link>
            </div>
          ))}

          {orders.length > 0 && (
            <div className="card rating-card">
              {ratingDone ? (
                <p className="ok-msg" style={{ margin: 0 }}>Thank you for rating our service!</p>
              ) : (
                <>
                  <p style={{ fontWeight: 600, marginBottom: ".5rem" }}>How was our service?</p>
                  <div className="rating-stars" role="radiogroup" aria-label="Service rating">
                    {[1, 2, 3, 4, 5].map(n => (
                      <button
                        key={n}
                        type="button"
                        className={`rating-star${n <= ratingScore ? " on" : ""}`}
                        onClick={() => setRatingScore(n)}
                        aria-label={`${n} star${n > 1 ? "s" : ""}`}
                        aria-pressed={n <= ratingScore}
                      >★</button>
                    ))}
                  </div>
                  <textarea
                    className="rating-comment"
                    value={ratingComment}
                    onChange={e => setRatingComment(e.target.value.slice(0, 500))}
                    placeholder="Any comments? (optional)"
                  />
                  <button className="btn" onClick={submitRating} disabled={!ratingScore}>Submit Rating</button>
                </>
              )}
            </div>
          )}
        </>
      )}

      {tab === "invoice" && (() => {
        if (orders.length === 0) return <p>No orders yet today.</p>;
        const groups = groupInvoices(orders);
        const dateStr = new Date().toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
        return (
          <div style={{ maxWidth: 560 }}>
            {groups.length > 1 && (
              <p style={{ fontSize: ".82rem", color: "var(--muted)", marginBottom: "1rem" }}>
                You have {groups.length} invoices today — each sitting is billed separately.
              </p>
            )}
            {groups.map((g, gi) => {
              const inv = g.inv;
              return (
                <div key={g.invoiceId ?? gi} style={{ marginBottom: "1.5rem" }}>
                  <div className="card" id={gi === 0 ? "total-invoice" : undefined}>
                    <div className="inv-brand">
                      <span className="inv-brand-name">Toast &amp; Roast</span>
                      <span className="inv-brand-sub">{g.isPaid ? "Invoice — Paid" : "Current Invoice"}</span>
                    </div>
                    <div style={{ textAlign: "center", marginBottom: ".8rem" }}>
                      <span className={`inv-status-pill ${g.isPaid ? "paid" : "unpaid"}`}>
                        {g.isPaid ? "✓ Paid" : "Unpaid — please settle at the counter"}
                      </span>
                    </div>
                    <div className="inv-meta">
                      <div><span className="inv-meta-k">Customer</span><span className="inv-meta-v">{session.name}</span></div>
                      <div><span className="inv-meta-k">Table No.</span><span className="inv-meta-v">{session.table}</span></div>
                      <div><span className="inv-meta-k">Date</span><span className="inv-meta-v">{dateStr}</span></div>
                      <div><span className="inv-meta-k">Orders</span><span className="inv-meta-v">{g.count}</span></div>
                    </div>
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
                  {gi === 0 && (
                    <div className="cta-row" style={{ marginTop: "1rem" }}>
                      <button className="btn ghost small" onClick={() => downloadInvoice("png", session)}>Download PNG</button>
                      <button className="btn ghost small" onClick={() => downloadInvoice("pdf", session)}>Download PDF</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })()}
    </div>
  );
}

/* Download the Total Invoice card as a PNG or a single-page PDF.
 * Uses html2canvas + jspdf (both already dependencies). The white card is
 * captured as-is; for PDF we scale the canvas to fit an A4 width. */
async function downloadInvoice(kind, session) {
  const el = document.getElementById("total-invoice");
  if (!el) return;
  const { default: html2canvas } = await import("html2canvas");
  const canvas = await html2canvas(el, { backgroundColor: "#ffffff", scale: 2 });
  const fname = `toast-roast-invoice-table-${session.table}`;
  if (kind === "png") {
    const link = document.createElement("a");
    link.download = `${fname}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    return;
  }
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const margin = 32;
  const imgW = pageW - margin * 2;
  const imgH = (canvas.height / canvas.width) * imgW;
  pdf.addImage(canvas.toDataURL("image/png"), "PNG", margin, margin, imgW, imgH);
  pdf.save(`${fname}.pdf`);
}

/* One-time PIN reveal after claiming a table.
 *
 * This is the ONLY moment the plaintext PIN is ever shown — it's stored
 * hashed and can't be retrieved again (staff can reset it if lost). The
 * card deliberately shows only the PIN + table + date — never the phone —
 * so if a saved screenshot leaks, it reveals as little as possible. */
function PinReveal({ data, onDone }) {
  const [saving, setSaving] = useState(false);
  const [ack, setAck] = useState(false);

  const download = async () => {
    setSaving(true);
    try {
      const { default: html2canvas } = await import("html2canvas");
      const el = document.getElementById("pin-card");
      const canvas = await html2canvas(el, { backgroundColor: "#17120F", scale: 2 });
      const link = document.createElement("a");
      link.download = `toast-roast-table-${data.table}-pin.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch { /* if capture fails, the PIN is still on screen to note down */ }
    setSaving(false);
  };

  return (
    <div className="pin-overlay" role="dialog" aria-modal="true" aria-labelledby="pin-reveal-title">
      <div className="pin-reveal">
        <div id="pin-card" className="pin-card">
          <span className="pin-card-brand">TOAST &amp; ROAST</span>
          <span className="pin-card-label">Table {data.table} · PIN</span>
          <span className="pin-card-code">{data.pin}</span>
          <span className="pin-card-note">Valid until your table is closed</span>
        </div>
        <h3 id="pin-reveal-title" className="pin-reveal-title">Save your table PIN</h3>
        <p className="pin-reveal-sub">
          You'll need this 4-digit PIN for every new order, and anyone joining your table must enter it.
          Don't worry if you forget it — it stays visible at the top of your orders screen, and staff can reset it.
        </p>
        <label className="pin-ack">
          <input type="checkbox" checked={ack} onChange={e => setAck(e.target.checked)} />
          I've written down or saved my PIN
        </label>
        <div className="cta-row">
          <button className="btn ghost" onClick={download} disabled={saving}>{saving ? "Saving…" : "Save as image"}</button>
          <button className="btn" onClick={onDone} disabled={!ack}>Done</button>
        </div>
      </div>
    </div>
  );
}
