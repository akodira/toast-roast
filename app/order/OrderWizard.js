"use client";
import { useEffect, useMemo, useState } from "react";
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
    telephone: qp.get("phone") || "",
  });

  // Ordering requires registering your table first — this page should
  // only ever be reached via a "Start New Order" / "Order More" link from
  // /portal, which supplies these three. A bare visit (no query params)
  // means someone skipped registration, so send them there instead.
  useEffect(() => {
    if (!qp.get("table") || !qp.get("name") || !qp.get("phone")) router.replace("/portal");
  }, [qp, router]);

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

  if (!qp.get("table") || !qp.get("name") || !qp.get("phone")) return null; // redirecting to /portal

  return (
    <div>
      <div className="steps">
        {stepNames.map((n, i) => <span key={n} className={`step-dot ${step === i + 1 ? "on" : ""}`}>{i + 1}. {n}</span>)}
      </div>
      {err && <p className="err" role="alert">{err}</p>}

      {step === 1 && (
        <div className="card" style={{ maxWidth: 480 }}>
          <p style={{ marginBottom: "1.2rem" }}>Ordering as, from your table registration:</p>
          <div className="field"><label>Table</label><p style={{ fontWeight: 600 }}>{info.tableNumber}</p></div>
          <div className="field"><label>Name</label><p style={{ fontWeight: 600 }}>{info.name}</p></div>
          <div className="field"><label>Telephone</label><p style={{ fontWeight: 600 }}>{info.telephone}</p></div>
          <p style={{ fontSize: ".82rem", opacity: .7, marginBottom: "1rem" }}>Not you, or wrong table? <a href="/portal">Go back to My Orders</a> to switch.</p>
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
          <h3 style={{ marginBottom: "1.2rem" }}>Shopping Cart</h3>
          {cartLines.length === 0 ? <p style={{ color: "var(--muted)" }}>Your cart is empty.</p> : (
            <>
              <div className="cart-list">
                {cartLines.map(l => (
                  <div className="cart-line" key={l.MenuItemId}>
                    <div className="cart-info">
                      <span className="cart-name">{l.Name}</span>
                      <span className="cart-unit">{fmt(l.Price)} each</span>
                    </div>
                    <span className="qty-ctl">
                      <button onClick={() => setQty(l.MenuItemId, -1)} aria-label={`Decrease ${l.Name}`}>−</button>
                      <span className="qty-val">{l.qty}</span>
                      <button onClick={() => setQty(l.MenuItemId, 1)} aria-label={`Increase ${l.Name}`}>+</button>
                    </span>
                    <span className="cart-total">{fmt(l.total)}</span>
                    <button className="cart-remove" onClick={() => setCart(c => ({ ...c, [l.MenuItemId]: 0 }))}
                      aria-label={`Remove ${l.Name}`} title="Remove">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M18 6 6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
              <div className="cart-sum">
                <span>Subtotal</span>
                <strong>{fmt(subtotal)}</strong>
              </div>
              <p className="cart-note">Tax and service are added at the next step.</p>
            </>
          )}
          <div className="cta-row" style={{ marginTop: "1.4rem" }}>
            <button className="btn ghost" onClick={() => setStep(3)}>Continue Shopping</button>
            <button className="btn" onClick={next} disabled={cartLines.length === 0}>Review Invoice</button>
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="card">
          <h3 style={{ marginBottom: "1.2rem" }}>Invoice Preview</h3>

          <div className="inv-who">
            <div>
              <span className="inv-who-label">Customer</span>
              <strong>{info.name}</strong>
            </div>
            <div>
              <span className="inv-who-label">Table</span>
              <strong>{info.tableNumber}</strong>
            </div>
            <div>
              <span className="inv-who-label">Phone</span>
              <strong>{info.telephone}</strong>
            </div>
          </div>

          <table className="inv">
            <thead><tr><th>Item</th><th className="num">Qty</th><th className="num">Unit Price</th><th className="num">Total</th></tr></thead>
            <tbody>{cartLines.map(l => (
              <tr key={l.MenuItemId}>
                <td>{l.Name}</td>
                <td className="num">{l.qty}</td>
                <td className="num">{fmt(l.Price)}</td>
                <td className="num">{fmt(l.total)}</td>
              </tr>
            ))}</tbody>
          </table>

          <div className="totals">
            <div className="row"><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
            <div className="row"><span>Tax ({taxP}%)</span><span>{fmt(tax)}</span></div>
            <div className="row"><span>Service ({svcP}%)</span><span>{fmt(service)}</span></div>
            <div className="row grand"><span>Grand Total</span><span>{fmt(grand)} EGP</span></div>
          </div>

          {err && <p className="err" style={{ marginTop: "1rem" }}>{err}</p>}

          <div className="cta-row" style={{ marginTop: "1.4rem" }}>
            <button className="btn ghost" onClick={() => setStep(4)}>Back to Cart</button>
            <button className="btn" onClick={submit} disabled={busy}>{busy ? "Submitting…" : "Submit Order"}</button>
          </div>
        </div>
      )}

    </div>
  );
}
