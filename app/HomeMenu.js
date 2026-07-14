"use client";
import { useState } from "react";
import Link from "next/link";
import CategoryIcon from "@/components/CategoryIcon";

/* Category rail + Style 7 dish list for the homepage "Our Menu" section.
   Every row links to /portal — ordering requires a registered table, so the
   "+" is an entry point to the join flow, not a cart add. */
export default function HomeMenu({ categories, items }) {
  const [cat, setCat] = useState(categories[0]?.CategoryId ?? 0);

  const active = categories.find(c => c.CategoryId === cat);
  const rows = items.filter(i => i.CategoryId === cat).slice(0, 8);

  return (
    <div className="menu-layout">
      <aside className="cat-list">
        {categories.map(c => (
          <button key={c.CategoryId} className={`cat ${cat === c.CategoryId ? "on" : ""}`} onClick={() => setCat(c.CategoryId)}>
            <span className="ic"><CategoryIcon name={c.Name} size={15} /></span>
            {c.Name}
          </button>
        ))}
      </aside>

      <div>
        <div className="s7">
          <div className="s7-head">
            <span className="arw">→</span>
            <h3>{active?.Name || "Menu"}</h3>
            <span className="arw">←</span>
          </div>

          {rows.length === 0 ? (
            <p style={{ color: "var(--muted)", textAlign: "center", padding: "1rem 0" }}>No items in this category yet.</p>
          ) : rows.map(i => (
            <div className="s7-row" key={i.MenuItemId}>
              <span className="s7-ico"><CategoryIcon name={active?.Name} /></span>
              <span className="s7-name">
                {i.Name}
                {i.Description && <span className="s7-desc">{i.Description}</span>}
              </span>
              <span className="s7-dots" />
              <span className="s7-price">EGP {i.Price.toFixed(2)}</span>
              <Link href="/portal" className="s7-add" aria-label={`Order ${i.Name}`}>+</Link>
            </div>
          ))}

          {active?.Note?.trim() && (
            <div className="s7-note">
              <span className="ni">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                  <path d="M3 2v7c0 1.1.9 2 2 2h1a2 2 0 0 0 2-2V2M6 2v20M18 8V2c-2 .5-3 2-3 4.5S16 11 18 11v11" />
                </svg>
              </span>
              <p>{active.Note}</p>
            </div>
          )}
        </div>

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

/* Photo card — still used by Popular Items. */
export function ItemCard({ item, badge }) {
  return (
    <article className="card-item">
      {item.ImageUrl ? (
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
