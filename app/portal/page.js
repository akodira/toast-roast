import { Header, Footer, getContent } from "@/components/SiteChrome";
import PortalClient from "./PortalClient";
export const dynamic = "force-dynamic";
export const metadata = { title: "My Table — Toast & Roast" };

export default async function PortalPage() {
  const content = await getContent();
  return (
    <>
      <Header content={content} />
      <main className="section container">
        <h2>My Table</h2>
        <PortalClient />
      </main>
      <Footer content={content} />
    </>
  );
}
