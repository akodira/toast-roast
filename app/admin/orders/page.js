"use client";
import { useEffect, useState } from "react";
import AdminShell from "../AdminShell";

const STATUSES = ["All", "Received", "Preparing", "Ready", "Delivered", "Cancelled"];
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
  const [filter, setFilter] = useState("All");
  const [calls, setCalls] = useState([]);
  const load = () => fetch(`/api/orders?status=${filter}`).then(r => r.json()).then(d => setOrders(d.orders || []));
  const loadCalls = () => fetch("/api/admin/waiter").then(r => r.ok ? r.json() : { calls: [] }).then(d => setCalls(d.calls || []));
  useEffect(() => { load(); const t = setInterval(load, 10000); return () => clearInterval(t); }, [filter]);
  useEffect(() => { loadCalls(); const t = setInterval(loadCalls, 8000); return () => clearInterval(t); }, []);
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

      <div className="filters filters-status">
        {STATUSES.map(s => (
          <button
            key={s}
            className={`chip chip-status${s === "All" ? "" : ` fs-${s}`} ${filter === s ? "on" : ""}`}
            onClick={() => setFilter(s)}
          >
            {s !== "All" && <span className="chip-dot" aria-hidden="true"></span>}
            {s}
          </button>
        ))}
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
                    {STATUSES.slice(1).map(s => <option key={s} value={s}>{s}</option>)}
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
