import Link from "next/link";
import { Header, Footer, getContent } from "@/components/SiteChrome";
import { getDb } from "@/lib/db";
export const dynamic = "force-dynamic";
export const metadata = { title: "Order Confirmed — Toast & Roast" };
const fmt = (n) => n.toFixed(2);

export default async function Confirm({ params }) {
  const content = await getContent();
  const db = await getDb();
  const o = await db.prepare(`SELECT o.*, c.Name CustomerName, c.Email, c.Telephone FROM Orders o JOIN Customers c ON c.CustomerId=o.CustomerId WHERE o.OrderNumber=$1`).get(params.orderNo);
  const items = o ? await db.prepare("SELECT * FROM OrderDetails WHERE OrderId=$1").all(o.OrderId) : [];
  return (
    <>
      <Header content={content} />
      <main className="section container">
        {!o ? <p className="err">Order not found.</p> : (
          <div className="card" style={{ maxWidth: 640, margin: "0 auto" }}>
            <h2 style={{ marginBottom: ".4rem" }}>Order Confirmed 🎉</h2>
            <p>Order <strong>{o.OrderNumber}</strong> · {o.CreatedAt} · Status: <span className={`status-pill st-${o.Status}`}>{o.Status}</span></p>
            <p style={{ marginTop: ".6rem" }}><strong>{o.CustomerName}</strong> · Table {o.TableNumber}<br />{o.Email} · {o.Telephone}</p>
            <table className="inv">
              <thead><tr><th>Item</th><th>Qty</th><th className="num">Unit Price</th><th className="num">Total</th></tr></thead>
              <tbody>{items.map(i => (
                <tr key={i.OrderDetailId}><td>{i.ItemName}</td><td>{i.Quantity}</td><td className="num">{fmt(i.UnitPrice)}</td><td className="num">{fmt(i.LineTotal)}</td></tr>
              ))}</tbody>
            </table>
            <div className="totals">
              <div className="row"><span>Subtotal</span><span>{fmt(o.Subtotal)}</span></div>
              <div className="row"><span>Tax ({o.TaxPercent}%)</span><span>{fmt(o.TaxAmount)}</span></div>
              <div className="row"><span>Service ({o.ServicePercent}%)</span><span>{fmt(o.ServiceAmount)}</span></div>
              <div className="row grand"><span>Grand Total</span><span>{fmt(o.GrandTotal)}</span></div>
            </div>
            <p style={{ marginTop: "1.2rem" }}><Link href="/menu" className="btn ghost">Back to Menu</Link></p>
          </div>
        )}
      </main>
      <Footer content={content} />
    </>
  );
}
