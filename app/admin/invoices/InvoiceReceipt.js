const fmt = (n) => Number(n).toFixed(2);

export default function InvoiceReceipt({ invoice, lines, subtotal, tax, service, grand, orderCount, branding }) {
  return (
    <div className="receipt" id="receipt-capture">
      <div className="r-center">
        {branding.invoice_logo ? (
          <img src={branding.invoice_logo} alt={branding.site_name} style={{ maxHeight: 50, margin: "0 auto" }} />
        ) : (
          <div className="r-logo">{branding.site_name}</div>
        )}
        {branding.tagline && <div className="r-tagline">{branding.tagline}</div>}
      </div>

      <hr className="r-divider" />

      {branding.invoice_branch_line && <div className="r-center r-branch">{branding.invoice_branch_line}</div>}
      <div className="r-center" style={{ fontSize: ".82rem", color: "#444", marginTop: ".2rem" }}>Invoice</div>
      <div className="r-center"><span className="r-num-box">Invoice #{invoice.InvoiceId}</span></div>
      <div className="r-center r-meta">Printed at {new Date().toLocaleString()}</div>

      <hr className="r-divider" />

      <div className="r-meta-row r-dine">
        <span>Dine In — Table {invoice.TableName}</span>
      </div>
      <div className="r-meta" style={{ marginTop: ".2rem" }}>{new Date(invoice.CreatedAt).toLocaleString()}</div>

      <div className="r-call">Customer: <strong>{invoice.CustomerName}</strong></div>

      <table className="r-items">
        <thead><tr><th className="qty">Qty</th><th className="item">Item</th><th className="num">Price</th><th className="num">Total</th></tr></thead>
        <tbody>
          {lines.map(l => (
            <tr key={l.name + l.price}>
              <td className="qty">{l.qty}</td>
              <td>{l.name}</td>
              <td className="num">{fmt(l.price)}</td>
              <td className="num">{fmt(l.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="r-totals">
        <div className="row bold"><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
        <div className="row"><span>Service ({invoice.ServicePercent}%)</span><span>{fmt(service)}</span></div>
        <div className="row"><span>VAT ({invoice.TaxPercent}%)</span><span>{fmt(tax)}</span></div>
        <div className="row grand"><span>Total</span><span>EGP {fmt(grand)}</span></div>
      </div>

      <hr className="r-divider" />
      <div className="r-footer">
        Products Count: {lines.reduce((s, l) => s + l.qty, 0)}
        {branding.invoice_footer_note && <><br />{branding.invoice_footer_note}</>}
      </div>
    </div>
  );
}
