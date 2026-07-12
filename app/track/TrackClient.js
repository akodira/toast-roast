"use client";
import { useState } from "react";
import Link from "next/link";

const fmt = (n) => n.toFixed(2);

export default function TrackClient() {
  const [phone, setPhone] = useState("");
  const [orders, setOrders] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const search = async () => {
    setBusy(true); setErr(""); setOrders(null);
    try {
      const res = await fetch(`/api/public/orders/lookup?phone=${encodeURIComponent(phone)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setOrders(data.orders);
    } catch (e) { setErr(e.message); }
    setBusy(false);
  };

  return (
    <div>
      <div className="card" style={{ maxWidth: 480, marginBottom: "1.5rem" }}>
        <div className="field">
          <label htmlFor="phone">Phone Number</label>
          <input id="phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)}
            placeholder="The number you ordered with" onKeyDown={e => e.key === "Enter" && search()} />
        </div>
        <button className="btn" onClick={search} disabled={busy || !phone.trim()}>{busy ? "Searching…" : "Find My Orders"}</button>
        {err && <p className="err" role="alert" style={{ marginTop: ".6rem" }}>{err}</p>}
        <p style={{ marginTop: ".7rem", fontSize: ".8rem", opacity: .7 }}>Shows today's orders only, matched to the phone number you ordered with.</p>
      </div>

      {orders && orders.length === 0 && <p>No orders found for that number today.</p>}

      {orders && orders.length > 0 && orders.map(o => {
        const orderMoreHref = `/order?table=${encodeURIComponent(o.TableNumber)}&name=${encodeURIComponent(o.CustomerName)}&email=${encodeURIComponent(o.Email || "")}&phone=${encodeURIComponent(o.Telephone)}`;
        return (
          <div className="card" key={o.OrderId} style={{ marginBottom: "1.2rem" }}>
            <p>Order <strong>{o.OrderNumber}</strong> · Table {o.TableNumber} · {new Date(o.CreatedAt).toLocaleTimeString()} ·{" "}
              <span className={`status-pill st-${o.Status}`}>{o.Status}</span>
            </p>
            <ul style={{ margin: ".6rem 0", paddingLeft: "1.1rem", fontSize: ".9rem" }}>
              {o.items.map(i => <li key={i.OrderDetailId}>{i.Quantity}× {i.ItemName} @ {fmt(i.UnitPrice)} — {fmt(i.LineTotal)}</li>)}
            </ul>
            <p style={{ fontWeight: 600 }}>Total: {fmt(o.GrandTotal)}</p>
            <div style={{ display: "flex", gap: ".8rem", marginTop: ".6rem", flexWrap: "wrap" }}>
              <Link href={`/order/confirm/${o.OrderNumber}`} className="btn small ghost">View Full Invoice</Link>
              <Link href={orderMoreHref} className="btn small">Order More to This Table</Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}
