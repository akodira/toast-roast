"use client";
import { useMemo, useState } from "react";

export default function MenuBrowser({ categories, items }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState(0);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return items.filter(i =>
      (!cat || i.CategoryId === cat) &&
      (!term || i.Name.toLowerCase().includes(term) || (i.Description || "").toLowerCase().includes(term))
    );
  }, [q, cat, items]);

  const shown = categories.filter(c => filtered.some(i => i.CategoryId === c.CategoryId));

  return (
    <>
      <input className="search-box" placeholder="Search the menu…" value={q} onChange={e => setQ(e.target.value)} aria-label="Search menu items" />
      <div className="filters">
        <button className={`chip ${cat === 0 ? "on" : ""}`} onClick={() => setCat(0)}>All</button>
        {categories.map(c => (
          <button key={c.CategoryId} className={`chip ${cat === c.CategoryId ? "on" : ""}`} onClick={() => setCat(c.CategoryId)}>{c.Name}</button>
        ))}
      </div>
      {shown.length === 0 && <p>No items match your search — try a different word.</p>}
      {shown.map(c => (
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
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}
