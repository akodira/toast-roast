"use client";
import { useState } from "react";
import Link from "next/link";

/* Category rail + item cards for the homepage "Our Menu" section.
   Every card links through to /portal — ordering requires a registered
   table, so the "+" is an entry point to the join flow, not a cart add. */
export default function HomeMenu({ categories, items }) {
  const [cat, setCat] = useState(0); // 0 = All Items

  const shown = (cat === 0 ? items : items.filter(i => i.CategoryId === cat)).slice(0, 8);

  return (
    <div className="menu-layout">
      <aside className="cat-list">
        <button className={`cat ${cat === 0 ? "on" : ""}`} onClick={() => setCat(0)}>
          <span className="ic">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          </span>
          All Items
        </button>
        {categories.map(c => (
          <button key={c.CategoryId} className={`cat ${cat === c.CategoryId ? "on" : ""}`} onClick={() => setCat(c.CategoryId)}>
            <span className="ic">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M3 2v7c0 1.1.9 2 2 2h1a2 2 0 0 0 2-2V2M6 2v20M18 8V2c-2 .5-3 2-3 4.5S16 11 18 11v11" />
              </svg>
            </span>
            {c.Name}
          </button>
        ))}
      </aside>

      <div>
        {shown.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>No items in this category yet.</p>
        ) : (
          <div className="cards compact-grid">
            {shown.map(i => <ItemCard key={i.MenuItemId} item={i} compact />)}
          </div>
        )}
        <div className="menu-more">
          <Link href="/menu" className="btn ghost">
            View Full Menu
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}

export function ItemCard({ item, badge, compact = false }) {
  return (
    <article className={`card-item${compact ? " compact" : ""}`}>
      {/* Photos are reserved for Popular Items — carrying a photo for all
          200+ menu items isn't maintainable, and a half-photographed menu
          looks broken rather than minimal. */}
      {!compact && (
        item.ImageUrl ? (
          <div className="card-img has-photo">
            {badge && <span className="badge">{badge}</span>}
            <img src={item.ImageUrl} alt={item.Name} />
          </div>
        ) : (
          <div className="card-img no-photo">
            {badge && <span className="badge">{badge}</span>}
            <div>
              <span className="mono">{item.Name.trim().charAt(0).toUpperCase()}</span>
              {item.CatName && <span className="cat-tag">{item.CatName}</span>}
            </div>
          </div>
        )
      )}
      <div className="card-body">
        <h4>{item.Name}</h4>
        {item.Description && <p className="desc">{item.Description}</p>}
        <div className="card-foot">
          <span className="price">EGP {item.Price.toFixed(2)}</span>
          <Link href="/portal" className="add" aria-label={`Order ${item.Name}`}>+</Link>
        </div>
      </div>
    </article>
  );
}
