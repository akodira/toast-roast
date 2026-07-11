import { Header, Footer, getContent } from "@/components/SiteChrome";
export const dynamic = "force-dynamic";
export const metadata = { title: "About Us — Toast & Roast" };

export default async function About() {
  const content = await getContent();
  return (
    <>
      <Header content={content} />
      <main className="section container">
        <h2>About Us</h2>
        <div className="card" dangerouslySetInnerHTML={{ __html: content.about_html }} />
      </main>
      <Footer content={content} />
    </>
  );
}
