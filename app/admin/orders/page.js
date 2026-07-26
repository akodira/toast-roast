"use client";
import { useEffect, useState, useRef } from "react";
import AdminShell from "../AdminShell";

const STATUSES = ["New", "Preparing", "Ready", "Delivered", "Cancelled", "All"];
// The real workflow statuses an order can be set to (excludes the "New" alias
// and the "All" filter). "New" in the tabs maps to "Received" orders.
const ORDER_STATUSES = ["Received", "Preparing", "Ready", "Delivered", "Cancelled"];
const TL_STEPS = [["Received", "ReceivedAt"], ["Preparing", "PreparingAt"], ["Ready", "ReadyAt"], ["Delivered", "DeliveredAt"]];
const hhmm = ts => ts ? new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";

function Timeline({ o }) {
  if (o.Status === "Cancelled") return <div className="otl"><span className="otl-step">Cancelled</span></div>;
  return (
    <div className="otl">
      {TL_STEPS.map(([label, col]) => {
        const done = !!o[col];
        return (
          <span className={`otl-step${done ? " done" : ""}`} key={col}>
            <span className="otl-tick">{done ? "✓" : ""}</span>
            {label}{done && <span className="otl-time"> {hhmm(o[col])}</span>}
          </span>
        );
      })}
    </div>
  );
}

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState("New");
  const [calls, setCalls] = useState([]);
  const [newCount, setNewCount] = useState(0);
  const [soundOn, setSoundOn] = useState(true);
  const prevNewIds = useRef(null); // ids of "Received" orders seen last poll
  const audioCtx = useRef(null);

  // "New" is a friendly alias for the Received status — freshly placed orders
  // the kitchen hasn't started yet. The API only knows real statuses, so map it.
  const apiStatus = filter === "New" ? "Received" : filter;
  const load = () => fetch(`/api/orders?status=${apiStatus}`).then(r => r.json()).then(d => setOrders(d.orders || []));
  const loadCalls = () => fetch("/api/admin/waiter").then(r => r.ok ? r.json() : { calls: [] }).then(d => setCalls(d.calls || []));

  // A short chime (Web Audio — no asset file needed) so the back office hears
  // a new order land even when not looking at the screen.
  const chime = () => {
    try {
      if (!audioCtx.current) audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = audioCtx.current;
      const now = ctx.currentTime;
      [880, 1175].forEach((freq, i) => {
        const osc = ctx.createOscillator(); const gain = ctx.createGain();
        osc.type = "sine"; osc.frequency.value = freq;
        osc.connect(gain); gain.connect(ctx.destination);
        const t = now + i * 0.16;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.35, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
        osc.start(t); osc.stop(t + 0.36);
      });
    } catch { /* audio not available — silent fallback */ }
  };

  // Poll the count of brand-new (Received) orders regardless of which tab is
  // open, so the chime + badge work everywhere. Chime when a genuinely new
  // order id appears (not on first load, not on status changes of existing ones).
  const pollNew = () => fetch("/api/orders?status=Received").then(r => r.json()).then(d => {
    const ids = new Set((d.orders || []).map(o => o.OrderId));
    setNewCount(ids.size);
    if (prevNewIds.current !== null) {
      let hasNew = false;
      ids.forEach(id => { if (!prevNewIds.current.has(id)) hasNew = true; });
      if (hasNew && soundOn) chime();
    }
    prevNewIds.current = ids;
  }).catch(() => {});

  useEffect(() => { load(); const t = setInterval(load, 10000); return () => clearInterval(t); }, [filter]);
  useEffect(() => { loadCalls(); const t = setInterval(loadCalls, 8000); return () => clearInterval(t); }, []);
  useEffect(() => { pollNew(); const t = setInterval(pollNew, 8000); return () => clearInterval(t); }, [soundOn]);
  const resolveCall = async (callId) => {
    await fetch("/api/admin/waiter", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ callId }) });
    loadCalls();
  };
  const setStatus = async (id, status) => {
    await fetch(`/api/orders/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    load();
  };
  const del = async (id, orderNumber) => {
    if (!confirm(`Permanently delete order ${orderNumber}? This can't be undone.`)) return;
    await fetch(`/api/orders/${id}`, { method: "DELETE" });
    load();
  };
  return (
    <AdminShell>
      <h1>Orders</h1>

      {calls.length > 0 && (
        <div className="callbar">
          <h3><span aria-hidden="true">🔔</span> Waiter requested ({calls.length})</h3>
          {calls.map(c => (
            <div className="callrow" key={c.CallId}>
              <span><strong>Table {c.TableName}</strong> · {c.CustomerName} · {hhmm(c.CreatedAt)}</span>
              <button className="btn small ghost" onClick={() => resolveCall(c.CallId)}>Mark done</button>
            </div>
          ))}
        </div>
      )}

      <div className="orders-toolbar">
        <div className="filters filters-status">
          {STATUSES.map(s => {
            const isNew = s === "New";
            const cls = isNew
              ? `chip chip-new${newCount > 0 ? " has-new" : ""}${filter === s ? " on" : ""}`
              : `chip chip-status${s === "All" ? "" : ` fs-${s}`} ${filter === s ? "on" : ""}`;
            return (
              <button key={s} className={cls} onClick={() => setFilter(s)}>
                {isNew
                  ? <><span className="chip-bell" aria-hidden="true">🔔</span>New{newCount > 0 && <span className="chip-badge">{newCount}</span>}</>
                  : <>{s !== "All" && <span className="chip-dot" aria-hidden="true"></span>}{s}</>}
              </button>
            );
          })}
        </div>
        <button
          className={`sound-toggle${soundOn ? " on" : ""}`}
          onClick={() => setSoundOn(v => !v)}
          title={soundOn ? "Sound on — click to mute new-order chime" : "Sound off — click to enable new-order chime"}
        >
          {soundOn ? "🔊" : "🔇"} {soundOn ? "Sound on" : "Muted"}
        </button>
      </div>
      <div className="table-wrap"><table className="adm">
        <thead><tr><th>Order #</th><th>Date & Time</th><th>Table</th><th>Customer</th><th>Contact</th><th>Items</th><th>Total</th><th>Status</th><th /></tr></thead>
        <tbody>
          {orders.length === 0 && <tr><td colSpan={9}>No orders yet — new orders appear here automatically.</td></tr>}
          {orders.map(o => (
            <tr key={o.OrderId}>
              <td><strong>{o.OrderNumber}</strong></td>
              <td>{new Date(o.CreatedAt).toLocaleString()}</td>
              <td>{o.TableNumber}</td>
              <td>{o.CustomerName}</td>
              <td>{o.Telephone}</td>
              <td>{o.items.map(i => (
                <div key={i.OrderDetailId} className="adm-item">
                  <span>{i.Quantity}× {i.ItemName}</span>
                  {i.Sides ? <span className="adm-item-sides">+ {i.Sides}</span> : null}
                  {i.Note ? <span className="adm-item-note">📝 {i.Note}</span> : null}
                </div>
              ))}</td>
              <td><strong>{o.GrandTotal.toFixed(2)}</strong></td>
              <td>
                <div className="status-cell">
                  <span className={`status-dot st-${o.Status}`} aria-hidden="true"></span>
                  <select
                    className={`status-select st-${o.Status}`}
                    value={o.Status}
                    onChange={e => setStatus(o.OrderId, e.target.value)}
                    aria-label={`Status for order ${o.OrderNumber}`}
                  >
                    {ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <Timeline o={o} />
              </td>
              <td><button className="btn small danger" onClick={() => del(o.OrderId, o.OrderNumber)}>Delete</button></td>
            </tr>
          ))}
        </tbody>
      </table></div>
    </AdminShell>
  );
}
