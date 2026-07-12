"use client";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const fmt = (n) => n.toFixed(2);

export default function OrderWizard({ categories, items, tables = [], settings }) {
  const router = useRouter();
  const qp = useSearchParams();
  const taxP = parseFloat(settings.tax_percent);
  const svcP = parseFloat(settings.service_percent);
  const [step, setStep] = useState(1);
  const [info, setInfo] = useState({
    tableNumber: qp.get("table") || "",
    name: qp.get("name") || "",
    email: qp.get("email") || "",
    telephone: qp.get("phone") || "",
  });
  const [cat, setCat] = useState(null);
  const [cart, setCart] = useState({}); // id -> qty
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const itemById = useMemo(() => Object.fromEntries(items.map(i => [i.MenuItemId, i])), [items]);
  const cartLines = Object.entries(cart).filter(([, q]) => q > 0).map(([id, q]) => {
    const it = itemById[id];
    return { ...it, qty: q, total: it.Price * q };
  });
  const subtotal = cartLines.reduce((s, l) => s + l.total, 0);
  const tax = subtotal * taxP / 100;
  const service = subtotal * svcP / 100;
  const grand = subtotal + tax + service;

  const setQty = (id, d) => setCart(c => ({ ...c, [id]: Math.max(0, Math.min(99, (c[id] || 0) + d)) }));

  const validateInfo = () => {
    if (!info.tableNumber.trim()) return "Please enter your table number.";
    if (!info.name.trim()) return "Please enter your name.";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(info.email) && info.email.trim())
      return "That doesn't look like a valid email address — or just leave it blank.";
    if (!/^[\d+\-\s()]{7,}$/.test(info.telephone)) return "Please enter a valid telephone number.";
    return "";
  };

  const next = () => {
    setErr("");
    if (step === 1) { const e = validateInfo(); if (e) return setErr(e); }
    if (step === 4 && cartLines.length === 0) return setErr("Your cart is empty — add at least one item.");
    setStep(s => s + 1);
  };

  const submit = async () => {
    setBusy(true); setErr("");
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...info, items: cartLines.map(l => ({ menuItemId: l.MenuItemId, quantity: l.qty })) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");
      router.push(`/order/confirm/${data.orderNumber}`);
    } catch (e) { setErr(e.message); setBusy(false); }
  };

  const stepNames = ["Your Details", "Categories", "Choose Items", "Cart", "Invoice"];

  return (
    <div>
      <div className="steps">
        {stepNames.map((n, i) => <span key={n} className={`step-dot ${step === i + 1 ? "on" : ""}`}>{i + 1}. {n}</span>)}
      </div>
      {err && <p className="err" role="alert">{err}</p>}

      {step === 1 && (
        <div className="card" style={{ maxWidth: 480 }}>
          <div className="field"><label htmlFor="tbl">Table Number *</label>
            {tables.length > 0 ? (
              <select id="tbl" value={info.tableNumber} onChange={e => setInfo({ ...info, tableNumber: e.target.value })}>
                <option value="">Select your table…</option>
                {tables.map(t => <option key={t.TableId} value={t.Name}>{t.Name}</option>)}
              </select>
            ) : (
              <input id="tbl" value={info.tableNumber} onChange={e => setInfo({ ...info, tableNumber: e.target.value })} />
            )}</div>
          <div className="field"><label htmlFor="nm">Customer Name *</label>
            <input id="nm" value={info.name} onChange={e => setInfo({ ...info, name: e.target.value })} /></div>
          <div className="field"><label htmlFor="em">Email Address <span style={{ opacity: .6, fontWeight: 400 }}>(optional)</span></label>
            <input id="em" type="email" value={info.email} onChange={e => setInfo({ ...info, email: e.target.value })} /></div>
          <div className="field"><label htmlFor="ph">Telephone Number *</label>
            <input id="ph" type="tel" value={info.telephone} onChange={e => setInfo({ ...info, telephone: e.target.value })} /></div>
          <button className="btn" onClick={next}>Continue</button>
        </div>
      )}

      {step === 2 && (
        <>
          <p style={{ marginBottom: "1rem" }}>Pick a category to start adding items — you can switch anytime.</p>
          <div className="field" style={{ maxWidth: 360 }}>
            <label htmlFor="cat-select">Category</label>
            <select id="cat-select" value={cat || ""} onChange={e => { setCat(+e.target.value); setStep(3); }}>
              <option value="">Select a category…</option>
              {categories.map(c => <option key={c.CategoryId} value={c.CategoryId}>{c.Name}</option>)}
            </select>
          </div>
          <button className="btn ghost" onClick={() => setStep(1)}>Back</button>
        </>
      )}

      {step === 3 && (
        <>
          <div className="field" style={{ maxWidth: 360 }}>
            <label htmlFor="cat-select-3">Category</label>
            <select id="cat-select-3" value={cat || ""} onChange={e => setCat(+e.target.value)}>
              {categories.map(c => <option key={c.CategoryId} value={c.CategoryId}>{c.Name}</option>)}
            </select>
          </div>
          <div className="menu-grid">
            {items.filter(i => i.CategoryId === cat && i.IsAvailable).map(i => (
              <div className="menu-line" key={i.MenuItemId}>
                <span className="nm">{i.Name}{i.Description && <span className="desc">{i.Description}</span>}</span>
                <span className="dots" />
                <span className="pr">{fmt(i.Price)}</span>
                <span className="qty-ctl">
                  <button aria-label={`Remove one ${i.Name}`} onClick={() => setQty(i.MenuItemId, -1)}>−</button>
                  <span>{cart[i.MenuItemId] || 0}</span>
                  <button aria-label={`Add one ${i.Name}`} onClick={() => setQty(i.MenuItemId, 1)}>+</button>
                </span>
              </div>
            ))}
          </div>
          <p style={{ margin: "1.2rem 0", fontWeight: 600 }}>Running subtotal: {fmt(subtotal)} {settings.currency}</p>
          <div className="cta-row" style={{ display: "flex", gap: "1rem" }}>
            <button className="btn ghost" onClick={() => setStep(2)}>Back to Categories</button>
            <button className="btn" onClick={() => setStep(4)}>View Cart ({cartLines.reduce((s, l) => s + l.qty, 0)})</button>
          </div>
        </>
      )}

      {step === 4 && (
        <div className="card">
          <h3 style={{ marginBottom: "1rem" }}>Shopping Cart</h3>
          {cartLines.length === 0 ? <p>Your cart is empty.</p> : (
            <div className="table-wrap"><table className="inv">
              <thead><tr><th>Item</th><th>Qty</th><th className="num">Unit Price</th><th className="num">Total</th><th /></tr></thead>
              <tbody>
                {cartLines.map(l => (
                  <tr key={l.MenuItemId}>
                    <td>{l.Name}</td>
                    <td><span className="qty-ctl">
                      <button onClick={() => setQty(l.MenuItemId, -1)} aria-label="Decrease">−</button>
                      <span>{l.qty}</span>
                      <button onClick={() => setQty(l.MenuItemId, 1)} aria-label="Increase">+</button>
                    </span></td>
                    <td className="num">{fmt(l.Price)}</td>
                    <td className="num">{fmt(l.total)}</td>
                    <td><button className="btn small danger" onClick={() => setCart(c => ({ ...c, [l.MenuItemId]: 0 }))}>Remove</button></td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginTop: "1rem" }}>
            <button className="btn ghost" onClick={() => setStep(3)}>Continue Shopping</button>
            <button className="btn" onClick={next} disabled={cartLines.length === 0}>Review Invoice</button>
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="card">
          <h3 style={{ marginBottom: ".8rem" }}>Invoice Preview</h3>
          <p><strong>{info.name}</strong> · Table {info.tableNumber}<br />{info.email} · {info.telephone}</p>
          <div className="table-wrap"><table className="inv">
            <thead><tr><th>Item</th><th>Qty</th><th className="num">Unit Price</th><th className="num">Total</th></tr></thead>
            <tbody>{cartLines.map(l => (
              <tr key={l.MenuItemId}><td>{l.Name}</td><td>{l.qty}</td><td className="num">{fmt(l.Price)}</td><td className="num">{fmt(l.total)}</td></tr>
            ))}</tbody>
          </table></div>
          <div className="totals">
            <div className="row"><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
            <div className="row"><span>Tax ({taxP}%)</span><span>{fmt(tax)}</span></div>
            <div className="row"><span>Service ({svcP}%)</span><span>{fmt(service)}</span></div>
            <div className="row grand"><span>Grand Total</span><span>{fmt(grand)} {settings.currency}</span></div>
          </div>
          <div style={{ display: "flex", gap: "1rem", marginTop: "1.2rem", flexWrap: "wrap" }}>
            <button className="btn ghost" onClick={() => setStep(4)}>Back to Cart</button>
            <button className="btn" onClick={submit} disabled={busy}>{busy ? "Submitting…" : "Submit Order"}</button>
          </div>
        </div>
      )}
    </div>
  );
}
