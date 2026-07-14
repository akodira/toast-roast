import Link from "next/link";
import { cache } from "react";
import { getDb } from "@/lib/db";

export const getContent = cache(async function getContent() {
  const db = await getDb();
  const rows = await db.prepare("SELECT * FROM WebsiteContent").all();
  return Object.fromEntries(rows.map(r => [r.ContentKey, r.ContentValue]));
});

function CupIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <path d="M17 8h1a4 4 0 1 1 0 8h-1" /><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
      <path d="M6 2v2M10 2v2M14 2v2" />
    </svg>
  );
}

function TableIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 9h18" /><path d="M5 9v11" /><path d="M19 9v11" /><path d="M12 9v4" /><path d="M8 13h8" />
    </svg>
  );
}

export function Brand({ content }) {
  return (
    <Link href="/" className="brand">
      <span className="brand-mark">
        {content.site_logo ? <img src={content.site_logo} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : <CupIcon />}
      </span>
      <span className="brand-txt">{content.site_name}<small>{content.tagline}</small></span>
    </Link>
  );
}

/* `onHero` makes the header transparent and overlay the hero (homepage only). */
export function Header({ content, onHero = false }) {
  return (
    <header className={`site-header${onHero ? " on-hero" : ""}`}>
      <div className="container">
        <Brand content={content} />
        <nav className="nav" aria-label="Main">
          <Link href="/">Home</Link>
          <Link href="/menu">Menu</Link>
          <Link href="/about">About Us</Link>
          <Link href="/contact">Contact</Link>
        </nav>
        <Link href="/portal" className="btn small nav-cta"><TableIcon /> Join a Table</Link>
      </div>
    </header>
  );
}

export function Footer({ content }) {
  const socials = [
    [content.facebook_url, "Facebook", <path key="f" d="M13.5 9H16V6h-2.5C11.6 6 10 7.6 10 9.5V11H8v3h2v7h3v-7h2.2l.8-3H13v-1.5c0-.3.2-.5.5-.5Z" />],
    [content.instagram_url, "Instagram", <path key="i" d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7ZM3 8a5 5 0 0 1 5-5h8a5 5 0 0 1 5 5v8a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5V8Zm14-1a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z" />],
  ].filter(([url]) => url);

  return (
    <footer className="site-footer">
      <div className="container">
        <div className="cols">
          <div>
            <Brand content={content} />
            {socials.length > 0 && (
              <div className="socials">
                {socials.map(([url, label, path]) => (
                  <a key={label} href={url} className="soc" aria-label={label} target="_blank" rel="noopener noreferrer">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">{path}</svg>
                  </a>
                ))}
              </div>
            )}
          </div>

          <div>
            <h5>Quick Links</h5>
            <ul>
              <li><Link href="/">Home</Link></li>
              <li><Link href="/menu">Menu</Link></li>
              <li><Link href="/about">About Us</Link></li>
              <li><Link href="/contact">Contact</Link></li>
            </ul>
          </div>

          <div>
            <h5>Order</h5>
            <ul>
              <li><Link href="/portal">Join a Table</Link></li>
              <li><Link href="/portal">My Orders</Link></li>
              <li><Link href="/menu">Full Menu</Link></li>
            </ul>
          </div>

          <div>
            <h5>Contact Us</h5>
            {content.contact_phone && (
              <div className="contact-li">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z" /></svg>
                {content.contact_phone}
              </div>
            )}
            {content.contact_email && (
              <div className="contact-li">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m2 7 10 6 10-6" /></svg>
                {content.contact_email}
              </div>
            )}
            {content.contact_address && (
              <div className="contact-li">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
                {content.map_url
                  ? <a href={content.map_url} target="_blank" rel="noopener noreferrer">{content.contact_address}</a>
                  : content.contact_address}
              </div>
            )}
            {content.opening_hours && (
              <div className="contact-li">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
                {content.opening_hours}
              </div>
            )}
          </div>
        </div>

        <div className="fine-row">
          <span>© {new Date().getFullYear()} {content.site_name}. All rights reserved.</span>
          {content.footer_note && <span className="footer-note" dangerouslySetInnerHTML={{ __html: content.footer_note }} />}
        </div>
      </div>
    </footer>
  );
}
