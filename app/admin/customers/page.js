"use client";
import { useEffect, useState } from "react";
import AdminShell from "../AdminShell";

const fmtDate = ts => ts ? new Date(ts).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [q, setQ] = useState("");
  const [editKey, setEditKey] = useState(null);
  const [editName, setEditName] = useState("");
  const [msg, setMsg] = useState("");
  const [history, setHistory] = useState(null); // { customer, orders, invoices } | null
  const [loadingHist, setLoadingHist] = useState(false);
  const [expanded, setExpanded] = useState({}); // invoiceId -> bool
  const load = () => fetch("/api/admin/customers").then(r => r.json()).then(d => setCustomers(d.customers || []));
  useEffect(() => { load(); }, []);

  const startEdit = (c) => { setEditKey(c.phoneKey); setEditName(c.name || ""); setMsg(""); };
  const cancel = () => { setEditKey(null); setEditName(""); };
  const save = async (c) => {
    if (!editName.trim()) return;
    const res = await fetch("/api/admin/customers", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phoneKey: c.phoneKey, name: editName.trim() }),
    });
    if (res.ok) { setMsg(`Updated ${editName.trim()}.`); cancel(); load(); }
    else { const d = await res.json().catch(() => ({})); setMsg(d.error || "Could not save."); }
  };

  const del = async (c) => {
    if (!confirm(`Delete ${c.name || "this customer"} (${c.mobile}) and ALL their orders and invoices? This can't be undone.`)) return;
    const res = await fetch("/api/admin/customers", {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phoneKey: c.phoneKey }),
    });
    if (res.ok) { setMsg(`Deleted ${c.name || "customer"}.`); load(); }
    else { const d = await res.json().catch(() => ({})); setMsg(d.error || "Could not delete."); }
  };

  const openHistory = async (c) => {
    setLoadingHist(true);
    setExpanded({});
    setHistory({ customer: c, orders: [], invoices: [] });
    try {
      const res = await fetch(`/api/admin/customers/history?phoneKey=${encodeURIComponent(c.phoneKey)}`);
      const d = await res.json();
      setHistory({ customer: c, orders: d.orders || [], invoices: d.invoices || [] });
    } catch { setHistory({ customer: c, orders: [], invoices: [], error: true }); }
    setLoadingHist(false);
  };
  const closeHistory = () => setHistory(null);

  const filtered = customers.filter(c => {
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return (c.name || "").toLowerCase().includes(s) || (c.mobile || "").includes(q.trim());
  });

  return (
    <AdminShell>
      <h1>Customers</h1>
      {msg && <p className="ok-msg">{msg}</p>}
      <div className="cust-toolbar">
        <input className="cust-search" value={q} onChange={e => setQ(e.target.value)} placeholder="Search by name or mobile…" />
        <span className="cust-count">{filtered.length} customer{filtered.length === 1 ? "" : "s"}</span>
      </div>
      <div className="table-wrap"><table className="adm">
        <thead><tr><th>Customer Name</th><th>Mobile</th><th className="num">Total Orders</th><th>Last Visit</th><th /></tr></thead>
        <tbody>
          {filtered.length === 0 && <tr><td colSpan={5} style={{ textAlign: "center", color: "var(--muted)" }}>No customers yet.</td></tr>}
          {filtered.map(c => (
            <tr key={c.phoneKey}>
              <td>
                {editKey === c.phoneKey
                  ? <input className="cust-edit-input" value={editName} onChange={e => setEditName(e.target.value)} autoFocus />
                  : <strong>{c.name || "—"}</strong>}
              </td>
              <td>{c.mobile}</td>
              <td className="num">{c.totalOrders}</td>
              <td>{fmtDate(c.lastVisit)}</td>
              <td style={{ whiteSpace: "nowrap" }}>
                {editKey === c.phoneKey
                  ? <>
                      <button className="btn small" onClick={() => save(c)}>Save</button>{" "}
                      <button className="btn small ghost" onClick={cancel}>Cancel</button>
                    </>
                  : <>
                      <button className="btn small ghost" onClick={() => openHistory(c)}>History</button>{" "}
                      <button className="btn small ghost" onClick={() => startEdit(c)}>Edit name</button>{" "}
                      <button className="btn small danger" onClick={() => del(c)}>Delete</button>
                    </>}
              </td>
            </tr>
          ))}
        </tbody>
      </table></div>

      {history && (
        <div className="hist-overlay" onClick={closeHistory}>
          <div className="hist-panel" onClick={e => e.stopPropagation()}>
            <div className="hist-head">
              <div>
                <h2 style={{ margin: 0 }}>{history.customer.name || "Customer"}</h2>
                <p style={{ margin: ".2rem 0 0", color: "var(--muted)", fontSize: ".85rem" }}>{history.customer.mobile}</p>
              </div>
              <button className="btn small ghost" onClick={closeHistory}>✕ Close</button>
            </div>

            {loadingHist ? <p>Loading history…</p> : (
              <>
                <h3 className="hist-sec">Invoices ({history.invoices.length})</h3>
                {history.invoices.length === 0 ? <p className="hist-empty">No invoices yet.</p> : (
                  <div className="hist-inv-list">
                    {history.invoices.map(inv => {
                      const invOrders = history.orders.filter(o => o.GroupInvoiceId === inv.InvoiceId);
                      const open = !!expanded[inv.InvoiceId];
                      return (
                        <div className={`hist-inv${open ? " open" : ""}`} key={inv.InvoiceId}>
                          <button className="hist-inv-head" onClick={() => setExpanded(e => ({ ...e, [inv.InvoiceId]: !open }))}>
                            <span className="hist-inv-toggle" aria-hidden="true">{open ? "−" : "+"}</span>
                            <span className="hist-inv-date">{fmtDate(inv.CreatedAt)}</span>
                            <span className="hist-inv-meta">Table {inv.TableName} · {inv.OrderCount} order{inv.OrderCount === 1 ? "" : "s"}</span>
                            <span className="hist-inv-total">{Number(inv.total ?? inv.Total ?? 0).toFixed(2)}</span>
                            {inv.IsPaid
                              ? <span className="status-pill st-Ready">Paid</span>
                              : <span className="status-pill st-Pending">Unpaid</span>}
                          </button>
                          {open && (
                            <div className="hist-inv-body">
                              {invOrders.length === 0 ? <p className="hist-empty">No order details.</p> : invOrders.map(o => (
                                <div className="hist-order" key={o.OrderId}>
                                  <div className="hist-order-head">
                                    <span><strong>{o.OrderNumber}</strong> · {fmtDate(o.CreatedAt)}</span>
                                    <span className={`status-pill st-${o.Status}`}>{o.Status}</span>
                                  </div>
                                  <ul className="hist-items">
                                    {o.items.map((i, ix) => (
                                      <li key={ix}>
                                        {i.Quantity}× {i.ItemName} — {Number(i.LineTotal).toFixed(2)}
                                        {i.Sides ? <span className="hist-sub"> + {i.Sides}</span> : null}
                                        {i.Note ? <span className="hist-sub"> · {i.Note}</span> : null}
                                      </li>
                                    ))}
                                  </ul>
                                  <div className="hist-order-total">Order total: {Number(o.GrandTotal).toFixed(2)}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </AdminShell>
  );
}
