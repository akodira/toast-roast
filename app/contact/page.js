import { Header, Footer, getContent } from "@/components/SiteChrome";
export const dynamic = "force-dynamic";
export const metadata = { title: "Contact Us — Toast & Roast" };

export default async function Contact() {
  const content = await getContent();
  return (
    <>
      <Header content={content} />
      <main className="section container">
        <h2>Contact Us</h2>
        <div className="card">
          <p><strong>Address:</strong> {content.contact_address}{content.map_url && <> · <a href={content.map_url} target="_blank" rel="noopener noreferrer">View on Map →</a></>}</p>
          <p><strong>Phone:</strong> {content.contact_phone}</p>
          <p><strong>Email:</strong> {content.contact_email}</p>
          <p><strong>Opening hours:</strong> {content.opening_hours}</p>
        </div>
      </main>
      <Footer content={content} />
    </>
  );
}
