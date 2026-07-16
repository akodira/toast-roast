"use client";
import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import CategoryIcon from "@/components/CategoryIcon";

/* Typographic monogram — the deliberate stand-in for a per-item photo.
   244 items would mean 244 assets; initials look intentional, not missing. */
function monogram(name = "") {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "•";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

function DownloadIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M7 10l5 5 5-5" /><path d="M12 15V3" />
    </svg>
  );
}
function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" />
    </svg>
  );
}
function InfoIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" />
    </svg>
  );
}
function LeafIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 21c0-8 5-13 14-14 0 9-5 14-14 14z" /><path d="M5 21c2-5 5-8 9-10" />
    </svg>
  );
}

/* One row. Same markup whether it appears under a single category or in the
   all-categories / search list, so the two views can never drift apart. */
function ItemRow({ item }) {
  return (
    <div className={`mv-item${item.IsAvailable ? "" : " unavailable"}`}>
      <span className="mv-mono" aria-hidden="true">{monogram(item.Name)}</span>
      <span className="mv-body">
        <span className="nm">
          {item.Name}
          {!item.IsAvailable && <span className="badge-out">Out of stock</span>}
        </span>
        {item.Description && <span className="desc">{item.Description}</span>}
      </span>
      <span className="pr">{item.Price.toFixed(2)}</span>
      {item.IsAvailable
        ? <Link href="/portal" className="showcase-add mv-add" aria-label={`Order ${item.Name} — join a table first`} title="Join a table to order">+</Link>
        : <span className="mv-add-spacer" />}
    </div>
  );
}

export default function MenuBrowser({ categories, items, eyebrow, pdfUrl, taxPercent, servicePercent }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState(categories[0]?.CategoryId || 0);

  const term = q.trim().toLowerCase();
  const searching = term.length > 0;

  const filtered = useMemo(() => {
    if (!term) return items;
    return items.filter(i =>
      i.Name.toLowerCase().includes(term) || (i.Description || "").toLowerCase().includes(term)
    );
  }, [term, items]);

  // "All Categories" or an active search → grouped list, no photo rail.
  const showAll = searching || cat === 0;
  const activeCategory = categories.find(c => c.CategoryId === cat);
  const shownCats = categories.filter(c => filtered.some(i => i.CategoryId === c.CategoryId));
  const rows = activeCategory ? items.filter(i => i.CategoryId === cat) : [];

  const hasImg = !!activeCategory?.ImageUrl;
  const showRail = !showAll && !!activeCategory;

  const vat = [
    servicePercent ? `${servicePercent}% service charge` : null,
    taxPercent ? `${taxPercent}% VAT` : null,
  ].filter(Boolean).join(" and ");

  return (
    <div className={`menu-layout-v4${showRail ? "" : " no-rail"}`}>

      {/* Desktop: sticky category rail. Mobile: hidden (chips take over). */}
      <aside className="mv-side" aria-label="Menu categories">
        <h2>Categories</h2>
        <button type="button" className={`mv-cat${cat === 0 ? " on" : ""}`} onClick={() => setCat(0)}>
          <CategoryIcon name="dish" size={17} />
          All Categories
        </button>
        {categories.map(c => (
          <button
            key={c.CategoryId}
            type="button"
            className={`mv-cat${cat === c.CategoryId ? " on" : ""}`}
            onClick={() => setCat(c.CategoryId)}
          >
            <CategoryIcon name={c.Name} size={17} />
            {c.Name}
          </button>
        ))}
      </aside>

      <section className="mv-main">

        {/* Mobile category chips — reuses the existing .chip styling. */}
        <div className="filters mv-chips">
          <button type="button" className={`chip${cat === 0 ? " on" : ""}`} onClick={() => setCat(0)}>All</button>
          {categories.map(c => (
            <button
              key={c.CategoryId}
              type="button"
              className={`chip${cat === c.CategoryId ? " on" : ""}`}
              onClick={() => setCat(c.CategoryId)}
            >
              {c.Name}
            </button>
          ))}
        </div>

        <div className="mv-head">
          <div>
            <span className="mv-eyebrow">{eyebrow}</span>
            <h1 className="mv-title">
              {searching ? "Search results" : (activeCategory && !showAll ? activeCategory.Name : "Full Menu")}
            </h1>
          </div>
          {pdfUrl && (
            <a href={pdfUrl} className="mv-pdf" target="_blank" rel="noopener noreferrer" download>
              <DownloadIcon />
              <span>Download Menu (PDF)</span>
            </a>
          )}
        </div>

        <div className="mv-filters">
          <label className="mv-search">
            <SearchIcon />
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search the menu…"
              aria-label="Search menu items"
            />
          </label>
          <div className="mv-select">
            <label htmlFor="menu-cat-select" className="sr-only">Category</label>
            <select id="menu-cat-select" value={cat} onChange={e => setCat(+e.target.value)}>
              <option value={0}>All Categories</option>
              {categories.map(c => <option key={c.CategoryId} value={c.CategoryId}>{c.Name}</option>)}
            </select>
          </div>
        </div>

        {/* Single category */}
        {!showAll && activeCategory && (
          <div className="mv-list">
            {rows.length === 0 && <p className="mv-empty">Nothing in this category yet.</p>}
            {rows.map(i => <ItemRow item={i} key={i.MenuItemId} />)}
          </div>
        )}

        {/* All categories / search results */}
        {showAll && (
          <>
            {shownCats.length === 0 && <p className="mv-empty">No items match your search — try a different word.</p>}
            {shownCats.map(c => (
              <div className="mv-group" key={c.CategoryId}>
                <h3 className="mv-group-head">
                  <CategoryIcon name={c.Name} size={16} />
                  {c.Name}
                </h3>
                <div className="mv-list">
                  {filtered.filter(i => i.CategoryId === c.CategoryId).map(i => (
                    <ItemRow item={i} key={i.MenuItemId} />
                  ))}
                </div>
              </div>
            ))}
          </>
        )}

        {activeCategory && !showAll && !searching && activeCategory.Note?.trim() && (
          <div className="mv-cat-note">
            <InfoIcon />
            <span>{activeCategory.Note}</span>
          </div>
        )}

        {vat && (
          <div className="mv-vat">
            <InfoIcon />
            All prices are subject to a {vat}.
          </div>
        )}
      </section>

      {/* Category showcase photo — only in single-category view. */}
      {showRail && (
        <aside className="mv-rail">
          <div className={`mv-photo${hasImg ? "" : " no-photo"}`}>
            {hasImg && (
              <Image
                src={activeCategory.ImageUrl}
                alt={activeCategory.Name}
                fill
                sizes="(max-width: 1080px) 100vw, 300px"
                quality={90}
                className={activeCategory.ImageFit === "contain" ? "fit-contain" : "fit-cover"}
                style={{ objectPosition: `${activeCategory.ImageFocusX ?? 50}% ${activeCategory.ImageFocusY ?? 50}%` }}
                priority
              />
            )}
            {!hasImg && <span className="mv-photo-mono">{monogram(activeCategory.Name)}</span>}
          </div>
        </aside>
      )}

    </div>
  );
}
