import { Header, Footer, getContent } from "@/components/SiteChrome";
import { getDb } from "@/lib/db";
import PortalClient from "./PortalClient";
export const dynamic = "force-dynamic";
export const metadata = { title: "My Table — Toast & Roast" };

export default async function PortalPage() {
  const content = await getContent();
  const db = await getDb();
  const tables = await db.prepare("SELECT * FROM Tables WHERE IsActive=true ORDER BY DisplayOrder").all();
  return (
    <>
      <Header content={content} />
      <main className="section container">
        <h2>My Table</h2>
        <PortalClient tables={tables} />
      </main>
      <Footer content={content} />
    </>
  );
}
