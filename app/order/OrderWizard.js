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
  const [notes, setNotes] = useState({}); // id -> special-instructions note
  const [sides, setSides] = useState({}); // id -> array of chosen side option names
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [pinOpen, setPinOpen] = useState(false); // PIN prompt shown at place-order time
  const [pin, setPin] = useState("");

  const itemById = useMemo(() => Object.fromEntries(items.map(i => [i.MenuItemId, i])), [items]);
  const cartLines = Object.entries(cart).filter(([, q]) => q > 0).map(([id, q]) => {
    const it = itemById[id];
    return { ...it, qty: q, total: it.Price * q, note: notes[id] || "", sides: sides[id] || [] };
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

  // Placing an order requires the table PIN every time (a stranger who
  // glimpsed the phone number still can't order without the secret). We ask
  // for it here, at submit — never in the URL, so it stays out of history.
  const submit = async () => {
    if (!/^\d{4}$/.test(pin.trim())) { setPinOpen(true); setErr(""); return; }
    setBusy(true); setErr("");
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...info, pin: pin.trim(), items: cartLines.map(l => ({ menuItemId: l.MenuItemId, quantity: l.qty, note: l.note, sides: l.sides })) }),
      });
      const data = await res.json();
      if (!res.ok) {
        // Wrong/locked PIN → reopen the prompt so they can retry.
        if (res.status === 403 || res.status === 429 || res.status === 400) { setPin(""); setPinOpen(true); }
        throw new Error(data.error || "Something went wrong. Please try again.");
      }
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
                  <div className="cart-line-wrap" key={l.MenuItemId}>
                    <div className="cart-line">
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
                    {l.SideOptions && l.SideOptions.trim() && (() => {
                      const opts = l.SideOptions.split("\n").map(s => s.trim()).filter(Boolean);
                      const chosenList = sides[l.MenuItemId] || [];
                      const limit = l.SideLimit || 0; // 0 = unlimited
                      const atLimit = limit > 0 && chosenList.length >= limit;
                      return (
                        <div className="cart-extra">
                          <span className="cart-extra-lbl">
                            🍽️ Add sides <small>{limit > 0 ? `(choose up to ${limit}, free)` : "(free)"}</small>
                          </span>
                          <div className="cart-sides">
                            {opts.map(opt => {
                              const chosen = chosenList.includes(opt);
                              const disabled = !chosen && atLimit;
                              return (
                                <label key={opt} className={`side-chip${chosen ? " on" : ""}${disabled ? " disabled" : ""}`}>
                                  <input
                                    type="checkbox"
                                    checked={chosen}
                                    disabled={disabled}
                                    onChange={e => setSides(prev => {
                                      const cur = prev[l.MenuItemId] || [];
                                      if (e.target.checked) {
                                        if (limit > 0 && cur.length >= limit) return prev; // guard
                                        return { ...prev, [l.MenuItemId]: [...cur, opt] };
                                      }
                                      return { ...prev, [l.MenuItemId]: cur.filter(x => x !== opt) };
                                    })}
                                  />
                                  {opt}
                                </label>
                              );
                            })}
                          </div>
                          {limit > 0 && (
                            <span className="cart-sides-count">{chosenList.length} / {limit} selected</span>
                          )}
                        </div>
                      );
                    })()}
                    <div className="cart-extra">
                      <span className="cart-extra-lbl">📝 Note <small>(special instructions)</small></span>
                      <input
                        className="cart-note-input"
                        value={notes[l.MenuItemId] || ""}
                        onChange={e => setNotes(n => ({ ...n, [l.MenuItemId]: e.target.value.slice(0, 300) }))}
                        placeholder="e.g. no onions, extra spicy, well done…"
                        aria-label={`Special instructions for ${l.Name}`}
                      />
                    </div>
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
                <td>{l.Name}
                  {l.sides && l.sides.length > 0 ? <span className="inv-line-note">+ {l.sides.join(", ")}</span> : null}
                  {l.note ? <span className="inv-line-note">Note: {l.note}</span> : null}
                </td>
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

      {pinOpen && (
        <div className="pin-overlay" role="dialog" aria-modal="true" aria-labelledby="pin-modal-title" onClick={() => !busy && setPinOpen(false)}>
          <div className="pin-modal" onClick={e => e.stopPropagation()}>
            <h3 id="pin-modal-title">Enter your table PIN</h3>
            <p className="pin-modal-sub">The 4-digit PIN shown when your table was registered. Ask whoever registered it if you don't have it.</p>
            <input
              className="pin-modal-input"
              type="tel" inputMode="numeric" autoComplete="off" maxLength={4} autoFocus
              value={pin}
              onChange={e => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              onKeyDown={e => { if (e.key === "Enter" && pin.length === 4) { setPinOpen(false); submit(); } }}
              placeholder="••••"
              aria-label="Table PIN"
            />
            {err && <p className="err" role="alert" style={{ marginTop: ".6rem" }}>{err}</p>}
            <div className="cta-row" style={{ marginTop: "1rem" }}>
              <button className="btn ghost" onClick={() => { setPinOpen(false); setErr(""); }} disabled={busy}>Cancel</button>
              <button className="btn" onClick={() => { setPinOpen(false); submit(); }} disabled={busy || pin.length !== 4}>
                {busy ? "Placing…" : "Place Order"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
