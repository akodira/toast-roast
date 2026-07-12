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
        <div className="row grand"><span>Subtotal</span><span>{fmt(o.Subtotal)}</span></div>
      </div>
      <p style={{ marginTop: "1rem", fontSize: ".82rem", opacity: .75 }}>
        Status updates automatically. This is just this order's items — tax and service are applied once across all your orders today.
        See the <Link href="/portal">Total Invoice</Link> tab for your combined bill.
      </p>
      <div style={{ display: "flex", gap: "1rem", marginTop: "1rem", flexWrap: "wrap" }}>
        <Link href={orderMoreHref} className="btn">Order More Items</Link>
        <Link href="/portal" className="btn ghost">My Table / Total Invoice</Link>
        <Link href="/menu" className="btn ghost">Back to Menu</Link>
      </div>
    </div>
  );
}
