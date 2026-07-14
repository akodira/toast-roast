"use client";
import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";

export default function MenuBrowser({ categories, items }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState(categories[0]?.CategoryId || 0);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return items.filter(i =>
      (!term || i.Name.toLowerCase().includes(term) || (i.Description || "").toLowerCase().includes(term))
    );
  }, [q, items]);

  const searching = q.trim().length > 0;
  const activeCategory = categories.find(c => c.CategoryId === cat);
  const showAllGrid = searching || cat === 0;
  const shownCats = categories.filter(c => filtered.some(i => i.CategoryId === c.CategoryId));

  return (
    <>
      <input className="search-box" placeholder="Search the menu…" value={q} onChange={e => setQ(e.target.value)} aria-label="Search menu items" />
      <div className="field" style={{ maxWidth: 360 }}>
        <label htmlFor="menu-cat-select">Category</label>
        <select id="menu-cat-select" value={cat} onChange={e => setCat(+e.target.value)}>
          <option value={0}>All Categories</option>
          {categories.map(c => <option key={c.CategoryId} value={c.CategoryId}>{c.Name}</option>)}
        </select>
      </div>

      {/* Single-category showcase */}
      {!showAllGrid && activeCategory && (() => {
        const split  = activeCategory.ImageLayout === "split";
        const fit    = activeCategory.ImageFit === "contain" ? "contain" : "cover";
        const fx     = activeCategory.ImageFocusX ?? 50;
        const fy     = activeCategory.ImageFocusY ?? 50;
        const hasImg = !!activeCategory.ImageUrl;
        const rows   = items.filter(i => i.CategoryId === cat);

        const info = (
          <div className="showcase-info">
            <h2>{activeCategory.Name}</h2>
            {rows.map(i => (
              <div className="showcase-row" key={i.MenuItemId}>
                <span className="nm">
                  {i.Name}{!i.IsAvailable && " (out of stock)"}
                  {i.Description && <span className="desc">{i.Description}</span>}
                </span>
                <span className="pr">{i.Price.toFixed(2)}</span>
                {i.IsAvailable
                  ? <Link href="/portal" className="showcase-add" aria-label={`Order ${i.Name}`}>+</Link>
                  : <span />}
              </div>
            ))}
            {split && activeCategory.Note?.trim() && <p className="showcase-note">{activeCategory.Note}</p>}
          </div>
        );

        // SPLIT: photo gets its own column, nothing covering it.
        if (split) {
          return (
            <div className={`menu-showcase layout-split ${hasImg ? "" : "no-photo"}`}>
              {info}
              {hasImg && (
                <div className="showcase-media">
                  <Image
                    src={activeCategory.ImageUrl}
                    alt={activeCategory.Name}
                    fill
                    sizes="(max-width: 860px) 100vw, 640px"
                    quality={90}
                    className={fit === "contain" ? "fit-contain" : "fit-cover"}
                    style={{ objectPosition: `${fx}% ${fy}%` }}
                    priority
                  />
                </div>
              )}
            </div>
          );
        }

        // OVERLAY: original look — text floats over the photo behind a scrim.
        return (
          <div className={`menu-showcase ${hasImg ? "" : "no-photo"}`}>
            {hasImg && (
              <Image
                src={activeCategory.ImageUrl}
                alt={activeCategory.Name}
                fill
                sizes="(max-width: 700px) 100vw, 1100px"
                quality={90}
                style={{ objectFit: fit, objectPosition: `${fx}% ${fy}%` }}
                priority
              />
            )}
            {info}
            {activeCategory.Note?.trim() && <p className="showcase-note">{activeCategory.Note}</p>}
          </div>
        );
      })()}

      {/* Full-list / search results fallback */}
      {showAllGrid && (
        <>
          {shownCats.length === 0 && <p>No items match your search — try a different word.</p>}
          {shownCats.map(c => (
            <div className="menu-cat" key={c.CategoryId}>
              <h3>{c.Name}</h3>
              <div className="menu-grid">
                {filtered.filter(i => i.CategoryId === c.CategoryId).map(i => (
                  <div className={`menu-line ${i.IsAvailable ? "" : "unavailable"}`} key={i.MenuItemId}>
                    <span className="nm">
                      {i.Name}{!i.IsAvailable && <span className="badge-out">Out of stock</span>}
                      {i.Description && <span className="desc">{i.Description}</span>}
                    </span>
                    <span className="dots" />
                    <span className="pr">{i.Price.toFixed(2)}</span>
                    {/* keep the + here too — without it, "All Categories" and search
                        results were a dead end while single-category rows could order */}
                    {i.IsAvailable
                      ? <Link href="/portal" className="showcase-add" aria-label={`Order ${i.Name}`}>+</Link>
                      : <span />}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </>
      )}
    </>
  );
}
