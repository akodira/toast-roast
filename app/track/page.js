import { Header, Footer, getContent } from "@/components/SiteChrome";
import TrackClient from "./TrackClient";
export const dynamic = "force-dynamic";
export const metadata = { title: "My Orders — Toast & Roast" };

export default async function TrackPage() {
  const content = await getContent();
  return (
    <>
      <Header content={content} />
      <main className="section container">
        <h2>My Orders</h2>
        <p className="intro">Enter the phone number you ordered with to see today's order status, invoices, and to order more.</p>
        <TrackClient />
      </main>
      <Footer content={content} />
    </>
  );
}
