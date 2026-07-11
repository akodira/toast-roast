"use client";
import { useEffect, useState } from "react";
import AdminShell from "../AdminShell";

const STATUSES = ["All","Pending","Preparing","Ready","Served","Completed","Cancelled"];

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState("All");
  const load = () => fetch(`/api/orders?status=${filter}`).then(r => r.json()).then(d => setOrders(d.orders || []));
  useEffect(() => { load(); const t = setInterval(load, 10000); return () => clearInterval(t); }, [filter]);
  const setStatus = async (id, status) => {
    await fetch(`/api/orders/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    load();
  };
  return (
    <AdminShell>
      <h1>Orders</h1>
      <div className="filters">
        {STATUSES.map(s => <button key={s} className={`chip ${filter === s ? "on" : ""}`} onClick={() => setFilter(s)}>{s}</button>)}
      </div>
      <div className="table-wrap"><table className="adm">
        <thead><tr><th>Order #</th><th>Date & Time</th><th>Table</th><th>Customer</th><th>Contact</th><th>Items</th><th>Total</th><th>Status</th></tr></thead>
        <tbody>
          {orders.length === 0 && <tr><td colSpan={8}>No orders yet — new orders appear here automatically.</td></tr>}
          {orders.map(o => (
            <tr key={o.OrderId}>
              <td><strong>{o.OrderNumber}</strong></td>
              <td>{new Date(o.CreatedAt).toLocaleString()}</td>
              <td>{o.TableNumber}</td>
              <td>{o.CustomerName}</td>
              <td>{o.Telephone}<br /><small>{o.Email}</small></td>
              <td>{o.items.map(i => <div key={i.OrderDetailId}>{i.Quantity}× {i.ItemName}</div>)}</td>
              <td><strong>{o.GrandTotal.toFixed(2)}</strong></td>
              <td>
                <span className={`status-pill st-${o.Status}`}>{o.Status}</span><br />
                <select value={o.Status} onChange={e => setStatus(o.OrderId, e.target.value)} style={{ marginTop: ".3rem" }}>
                  {STATUSES.slice(1).map(s => <option key={s}>{s}</option>)}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table></div>
    </AdminShell>
  );
}
