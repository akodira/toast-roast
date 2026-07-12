import { Header, Footer, getContent } from "@/components/SiteChrome";
import { getDb } from "@/lib/db";
import OrderStatusLive from "../OrderStatusLive";
export const dynamic = "force-dynamic";
export const metadata = { title: "Order Confirmed — Toast & Roast" };

export default async function Confirm({ params }) {
  const content = await getContent();
  const db = await getDb();
  const o = await db.prepare(`SELECT o.*, c.Name CustomerName, c.Email, c.Telephone FROM Orders o JOIN Customers c ON c.CustomerId=o.CustomerId WHERE o.OrderNumber=$1`).get(params.orderNo);
  const items = o ? await db.prepare("SELECT * FROM OrderDetails WHERE OrderId=$1").all(o.OrderId) : [];
  return (
    <>
      <Header content={content} />
      <main className="section container">
        {!o ? <p className="err">Order not found.</p> : <OrderStatusLive initialOrder={{ ...o, items }} />}
      </main>
      <Footer content={content} />
    </>
  );
}
