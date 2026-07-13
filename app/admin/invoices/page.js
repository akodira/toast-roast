"use client";
import { useEffect, useState } from "react";
import AdminShell from "../AdminShell";
import InvoiceReceipt from "./InvoiceReceipt";

const fmt = (n) => n.toFixed(2);

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [filter, setFilter] = useState("unpaid");
  const [msg, setMsg] = useState("");
  const [modal, setModal] = useState(null); // { invoice, lines, subtotal, tax, service, grand, orderCount, branding }
  const [pendingAction, setPendingAction] = useState(null); // "png" | "pdf" | null
  const [busy, setBusy] = useState(false);

  const load = () => fetch(`/api/admin/invoices?status=${filter === "all" ? "" : filter}`)
    .then(r => r.json()).then(d => setInvoices(d.invoices || []));

  useEffect(() => { load(); const t = setInterval(load, 10000); return () => clearInterval(t); }, [filter]);

  const togglePaid = async (inv) => {
    const res = await fetch(`/api/admin/invoices/${inv.InvoiceId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ IsPaid: !inv.IsPaid }),
    });
    const d = await res.json();
    setMsg(res.ok && d.tableReleased ? `Table ${inv.TableName} — all invoices paid, table released automatically.` : "");
    load();
  };

  const openReceipt = async (invoiceId, action) => {
    setBusy(true);
    try {
      const [detailRes, brandingRes] = await Promise.all([
        fetch(`/api/admin/invoices/${invoiceId}/detail`),
        fetch("/api/public/invoice-branding"),
      ]);
      const detail = await detailRes.json();
      const branding = await brandingRes.json();
      if (!detailRes.ok) throw new Error(detail.error || "Couldn't load invoice.");
      setModal({ ...detail, branding });
      setPendingAction(action === "view" ? null : action);
    } catch (e) {
      setMsg(e.message);
    }
    setBusy(false);
  };

  // Once the receipt is actually rendered in the DOM, run the pending export.
  useEffect(() => {
    if (!modal || !pendingAction) return;
    const run = async () => {
      const html2canvas = (await import("html2canvas")).default;
      const el = document.getElementById("receipt-capture");
      const canvas = await html2canvas(el, { scale: 2, backgroundColor: "#ffffff" });
      const filenameBase = `invoice-${modal.invoice.InvoiceId}`;
      if (pendingAction === "png") {
        const link = document.createElement("a");
        link.download = `${filenameBase}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
      } else if (pendingAction === "pdf") {
        const { jsPDF } = await import("jspdf");
        const widthPx = canvas.width / 2, heightPx = canvas.height / 2; // undo scale:2 so PDF page == PNG's real size
        const pdf = new jsPDF({ unit: "px", format: [widthPx, heightPx] });
        pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, widthPx, heightPx);
        pdf.save(`${filenameBase}.pdf`);
      }
      setPendingAction(null);
    };
    run();
  }, [modal, pendingAction]);

  const downloadFromModal = async (kind) => {
    const html2canvas = (await import("html2canvas")).default;
    const el = document.getElementById("receipt-capture");
    const canvas = await html2canvas(el, { scale: 2, backgroundColor: "#ffffff" });
    const filenameBase = `invoice-${modal.invoice.InvoiceId}`;
    if (kind === "png") {
      const link = document.createElement("a");
      link.download = `${filenameBase}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } else {
      const { jsPDF } = await import("jspdf");
      const widthPx = canvas.width / 2, heightPx = canvas.height / 2;
      const pdf = new jsPDF({ unit: "px", format: [widthPx, heightPx] });
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, widthPx, heightPx);
      pdf.save(`${filenameBase}.pdf`);
    }
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
              <td style={{ whiteSpace: "nowrap" }}>
                <button className="btn small ghost" onClick={() => togglePaid(inv)}>{inv.IsPaid ? "Mark Unpaid" : "Mark Paid"}</button>{" "}
                <button className="btn small ghost" disabled={busy} onClick={() => openReceipt(inv.InvoiceId, "view")}>View</button>{" "}
                <button className="btn small ghost" disabled={busy} onClick={() => openReceipt(inv.InvoiceId, "png")}>PNG</button>{" "}
                <button className="btn small ghost" disabled={busy} onClick={() => openReceipt(inv.InvoiceId, "pdf")}>PDF</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table></div>

      {modal && (
        <div className="receipt-modal-backdrop" onClick={() => setModal(null)}>
          <div onClick={e => e.stopPropagation()}>
            <div className="receipt-modal-actions">
              <button className="btn small" onClick={() => downloadFromModal("png")}>Download PNG</button>
              <button className="btn small" onClick={() => downloadFromModal("pdf")}>Download PDF</button>
              <button className="btn small ghost" onClick={() => setModal(null)}>Close</button>
            </div>
            <InvoiceReceipt {...modal} />
          </div>
        </div>
      )}
    </AdminShell>
  );
}
