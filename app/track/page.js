import { Header, Footer, getContent } from "@/components/SiteChrome";
import TrackClient from "./TrackClient";
export const dynamic = "force-dynamic";
export const metadata = { title: "Track Your Order — Toast & Roast" };

export default async function TrackPage() {
  const content = await getContent();
  return (
    <>
      <Header content={content} />
      <main className="section container">
        <h2>Track Your Order</h2>
        <p className="intro">Enter the phone number you ordered with to see today's order status and totals.</p>
        <TrackClient />
      </main>
      <Footer content={content} />
    </>
  );
}
