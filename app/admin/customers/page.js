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
                  : <button className="btn small ghost" onClick={() => startEdit(c)}>Edit name</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table></div>
    </AdminShell>
  );
}
