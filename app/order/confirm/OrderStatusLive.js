"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

const fmt = (n) => n.toFixed(2);

export default function OrderStatusLive({ initialOrder }) {
  const [o, setO] = useState(initialOrder);

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`/api/orders/${initialOrder.OrderNumber}`);
        const data = await res.json();
        if (res.ok && data.order) setO(prev => ({ ...prev, Status: data.order.Status }));
      } catch { /* ignore transient network errors, try again next tick */ }
    };
    const t = setInterval(poll, 8000);
    return () => clearInterval(t);
  }, [initialOrder.OrderNumber]);

  const orderMoreHref = `/order?table=${encodeURIComponent(o.TableNumber)}&name=${encodeURIComponent(o.CustomerName)}&email=${encodeURIComponent(o.Email || "")}&phone=${encodeURIComponent(o.Telephone)}`;

  return (
    <div className="card" style={{ maxWidth: 640, margin: "0 auto" }}>
      <h2 style={{ marginBottom: ".4rem" }}>Order Confirmed 🎉</h2>
      <p>Order <strong>{o.OrderNumber}</strong> · {new Date(o.CreatedAt).toLocaleString()} · Status:{" "}
        <span className={`status-pill st-${o.Status}`}>{o.Status}</span>
      </p>
      <p style={{ marginTop: ".6rem" }}><strong>{o.CustomerName}</strong> · Table {o.TableNumber}<br />{o.Email ? `${o.Email} · ` : ""}{o.Telephone}</p>
      <table className="inv">
        <thead><tr><th>Item</th><th>Qty</th><th className="num">Unit Price</th><th className="num">Total</th></tr></thead>
        <tbody>{o.items.map(i => (
          <tr key={i.OrderDetailId}><td>{i.ItemName}</td><td>{i.Quantity}</td><td className="num">{fmt(i.UnitPrice)}</td><td className="num">{fmt(i.LineTotal)}</td></tr>
        ))}</tbody>
      </table>
      <div className="totals">
        <div className="row"><span>Subtotal</span><span>{fmt(o.Subtotal)}</span></div>
        <div className="row"><span>Tax ({o.TaxPercent}%)</span><span>{fmt(o.TaxAmount)}</span></div>
        <div className="row"><span>Service ({o.ServicePercent}%)</span><span>{fmt(o.ServiceAmount)}</span></div>
        <div className="row grand"><span>Grand Total</span><span>{fmt(o.GrandTotal)}</span></div>
      </div>
      <p style={{ marginTop: "1rem", fontSize: ".82rem", opacity: .75 }}>
        Status updates automatically. Want another round? It'll be a separate order/ticket — this one stays as-is.
      </p>
      <div style={{ display: "flex", gap: "1rem", marginTop: "1rem", flexWrap: "wrap" }}>
        <Link href={orderMoreHref} className="btn">Order More Items</Link>
        <Link href="/track" className="btn ghost">Track All My Orders</Link>
        <Link href="/menu" className="btn ghost">Back to Menu</Link>
      </div>
    </div>
  );
}
