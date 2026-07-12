import Link from "next/link";
import { getDb } from "@/lib/db";

export async function getContent() {
  const db = await getDb();
  const rows = await db.prepare("SELECT * FROM WebsiteContent").all();
  return Object.fromEntries(rows.map(r => [r.ContentKey, r.ContentValue]));
}

export function Header({ content }) {
  return (
    <header className="site-header">
      <div className="container">
        <Link href="/" className="brand">{content.site_name}<small>{content.tagline}</small></Link>
        <nav className="nav" aria-label="Main">
          <Link href="/">Home</Link>
          <Link href="/menu">Menu</Link>
          <Link href="/about">About Us</Link>
          <Link href="/contact">Contact</Link>
          <Link href="/portal" className="btn small">My Table / Order</Link>
        </nav>
      </div>
    </header>
  );
}

export function Footer({ content }) {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="cols">
          <div><h4>{content.site_name}</h4><p>{content.tagline}</p></div>
          <div><h4>Visit Us</h4><p>{content.contact_address}<br/>{content.opening_hours}{content.map_url && <><br/><a href={content.map_url} target="_blank" rel="noopener noreferrer">View on Map →</a></>}</p></div>
          <div><h4>Contact</h4><p>{content.contact_phone}<br/>{content.contact_email}</p></div>
          <div><h4>Follow</h4><p><a href={content.facebook_url}>Facebook</a> · <a href={content.instagram_url}>Instagram</a></p></div>
        </div>
        {content.footer_note && <p className="footer-note">{content.footer_note}</p>}
        <p className="fine">© {new Date().getFullYear()} {content.site_name}.</p>
      </div>
    </footer>
  );
}
