import Link from "next/link";
import { cache } from "react";
import { getDb } from "@/lib/db";

export const getContent = cache(async function getContent() {
  const db = await getDb();
  const rows = await db.prepare("SELECT * FROM WebsiteContent").all();
  return Object.fromEntries(rows.map(r => [r.ContentKey, r.ContentValue]));
});

export function Header({ content }) {
  return (
    <header className="site-header">
      <div className="container">
        <Link href="/" className="brand">{content.site_name}</Link>
        <nav className="nav" aria-label="Main">
          <Link href="/">Home</Link>
          <Link href="/menu">Menu</Link>
          <Link href="/about">About</Link>
          <Link href="/contact">Contact</Link>
        </nav>
        <Link href="/portal" className="btn small nav-cta">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 21a8 8 0 0 0-16 0" /><circle cx="12" cy="7" r="4" />
          </svg>
          My Orders
        </Link>
      </div>
    </header>
  );
}

export function Footer({ content }) {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="cols">
          <div>
            <h4 className="brand-mark">{content.site_name}</h4>
            <p>{content.about_html ? content.about_html.replace(/<[^>]+>/g, "").slice(0, 140) + "…" : content.tagline}</p>
          </div>
          <div>
            <p className="eyebrow">Location &amp; Hours</p>
            <p>{content.contact_address}<br/>{content.opening_hours}{content.map_url && <><br/><a href={content.map_url} target="_blank" rel="noopener noreferrer">View on Map →</a></>}</p>
          </div>
          <div>
            <p className="eyebrow">Contact</p>
            <p>{content.contact_phone}<br/>{content.contact_email}<br/><a href={content.instagram_url}>Instagram</a> · <a href={content.facebook_url}>Facebook</a></p>
          </div>
        </div>
        {content.footer_note && <p className="footer-note" dangerouslySetInnerHTML={{ __html: content.footer_note }} />}
        <div className="fine-row">
          <span>© {new Date().getFullYear()} {content.site_name}. All rights reserved.</span>
          <span><a href={content.instagram_url}>Instagram</a> &nbsp;&nbsp; <a href={content.facebook_url}>Facebook</a></span>
        </div>
      </div>
    </footer>
  );
}
