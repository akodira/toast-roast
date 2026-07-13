"use client";
import { useEffect, useState } from "react";
import AdminShell from "../AdminShell";

const fmt = (n) => n.toFixed(2);

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [filter, setFilter] = useState("unpaid"); // "unpaid" | "paid" | "all"
  const [msg, setMsg] = useState("");

  const load = () => fetch(`/api/admin/invoices?status=${filter === "all" ? "" : filter}`)
    .then(r => r.json()).then(d => setInvoices(d.invoices || []));

  useEffect(() => { load(); const t = setInterval(load, 10000); return () => clearInterval(t); }, [filter]);

  const togglePaid = async (inv) => {
    const res = await fetch(`/api/admin/invoices/${inv.InvoiceId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ IsPaid: !inv.IsPaid }),
    });
    const d = await res.json();
    if (res.ok && d.tableReleased) setMsg(`Table ${inv.TableName} — all invoices paid, table released automatically.`);
    else setMsg("");
    load();
  };

  return (
    <AdminShell>
      <h1>Invoices</h1>
      <p style={{ marginBottom: "1rem", opacity: .8 }}>One invoice per customer at a table. Once every invoice for a table's current sitting is marked Paid, that table is released automatically.</p>
      {msg && <p className="ok-msg">{msg}</p>}
      <div className="filters" style={{ marginBottom: "1.2rem" }}>
        {["unpaid", "paid", "all"].map(f => (
          <button key={f} className={`chip ${filter === f ? "on" : ""}`} onClick={() => setFilter(f)}>{f[0].toUpperCase() + f.slice(1)}</button>
        ))}
      </div>
      <div className="table-wrap"><table className="adm">
        <thead><tr><th>Table</th><th>Customer</th><th>Phone</th><th>Orders</th><th>Subtotal</th><th>Tax</th><th>Service</th><th>Total</th><th>Status</th><th /></tr></thead>
        <tbody>
          {invoices.length === 0 && <tr><td colSpan={10}>No invoices in this view.</td></tr>}
          {invoices.map(inv => (
            <tr key={inv.InvoiceId}>
              <td>{inv.TableName}</td>
              <td>{inv.CustomerName}</td>
              <td>{inv.Telephone}</td>
              <td>{inv.OrderCount}</td>
              <td>{fmt(inv.Subtotal)}</td>
              <td>{fmt(inv.TaxAmount)}</td>
              <td>{fmt(inv.ServiceAmount)}</td>
              <td><strong>{fmt(inv.GrandTotal)}</strong></td>
              <td><span className={`status-pill ${inv.IsPaid ? "st-Completed" : "st-Pending"}`}>{inv.IsPaid ? "Paid" : "Not Paid"}</span></td>
              <td><button className="btn small ghost" onClick={() => togglePaid(inv)}>{inv.IsPaid ? "Mark Unpaid" : "Mark Paid"}</button></td>
            </tr>
          ))}
        </tbody>
      </table></div>
    </AdminShell>
  );
}
