"use client";
import { useEffect, useState } from "react";
import AdminShell from "./AdminShell";

export default function Dashboard() {
  const [s, setS] = useState(null);
  useEffect(() => { fetch("/api/admin/stats").then(r => r.json()).then(setS); }, []);
  return (
    <AdminShell>
      <h1>Dashboard</h1>
      {!s ? <p>Loading…</p> : (
        <>
          <div className="stat-grid">
            <div className="stat"><div className="v">{s.todayOrders}</div><div className="l">Today's Orders</div></div>
            <div className="stat"><div className="v">{s.pending}</div><div className="l">Pending Orders</div></div>
            <div className="stat"><div className="v">{s.completed}</div><div className="l">Completed Orders</div></div>
            <div className="stat"><div className="v">{s.totalSales.toFixed(0)}</div><div className="l">Total Sales (EGP)</div></div>
            <div className="stat"><div className="v">{s.customers}</div><div className="l">Customers</div></div>
            <div className="stat"><div className="v">{s.todayRevenue.toFixed(0)}</div><div className="l">Today's Revenue (EGP)</div></div>
          </div>
          <h2 style={{ fontSize: "1.1rem", marginBottom: ".8rem" }}>Revenue — Last 7 Days</h2>
          <div className="table-wrap"><table className="adm">
            <thead><tr><th>Date</th><th>Revenue (EGP)</th></tr></thead>
            <tbody>{s.last7.length === 0 ? <tr><td colSpan={2}>No orders yet.</td></tr> :
              s.last7.map(r => <tr key={r.d}><td>{r.d}</td><td>{r.t.toFixed(2)}</td></tr>)}</tbody>
          </table></div>
        </>
      )}
    </AdminShell>
  );
}
