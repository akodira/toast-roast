"use client";
import { useEffect, useState } from "react";
import AdminShell from "./AdminShell";

const egp = n => Number(n || 0).toLocaleString("en-EG", { maximumFractionDigits: 0 });
const egp2 = n => Number(n || 0).toLocaleString("en-EG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// --- tiny inline charts (no chart library dependency) ---
function BarRow({ label, value, max, sub }) {
  const pct = max > 0 ? Math.max(2, (value / max) * 100) : 0;
  return (
    <div className="kbar">
      <span className="kbar-lbl" title={label}>{label}</span>
      <span className="kbar-track"><span className="kbar-fill" style={{ width: `${pct}%` }} /></span>
      <span className="kbar-val">{sub}</span>
    </div>
  );
}

function LineChart({ points }) {
  if (!points.length) return <p className="kmuted">No data yet.</p>;
  const W = 640, H = 180, pad = 30;
  const max = Math.max(...points.map(p => p.t), 1);
  const stepX = points.length > 1 ? (W - pad * 2) / (points.length - 1) : 0;
  const x = i => pad + i * stepX;
  const y = v => H - pad - (v / max) * (H - pad * 2);
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(p.t)}`).join(" ");
  const area = `${line} L ${x(points.length - 1)} ${H - pad} L ${x(0)} ${H - pad} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="kline" preserveAspectRatio="none">
      <path d={area} fill="rgba(192,138,86,.12)" />
      <path d={line} fill="none" stroke="#C08A56" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => <circle key={i} cx={x(i)} cy={y(p.t)} r="3" fill="#8A5A2E" />)}
    </svg>
  );
}

export default function Dashboard() {
  const [s, setS] = useState(null);
  const [ratings, setRatings] = useState(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    fetch("/api/admin/stats").then(r => r.ok ? r.json() : Promise.reject()).then(setS).catch(() => setErr("Could not load dashboard."));
    fetch("/api/admin/ratings").then(r => r.ok ? r.json() : null).then(setRatings).catch(() => {});
  }, []);

  if (err) return <AdminShell><h1>Dashboard</h1><p>{err}</p></AdminShell>;
  if (!s) return <AdminShell><h1>Dashboard</h1><p>Loading…</p></AdminShell>;

  const topMax = Math.max(...s.topItems.map(i => i.qty), 1);
  const catMax = Math.max(...s.byCategory.map(c => c.revenue), 1);
  const hourMax = Math.max(...s.byHour.map(h => h.t), 1);
  const tableMax = Math.max(...s.byTable.map(t => t.revenue), 1);

  return (
    <AdminShell>
      <h1>Dashboard</h1>

      {/* headline cards */}
      <div className="stat-grid">
        <div className="stat"><div className="v">{egp(s.todayRevenue)}</div><div className="l">Today's Revenue (EGP)</div></div>
        <div className="stat"><div className="v">{s.todayOrders}</div><div className="l">Today's Orders</div></div>
        <div className="stat"><div className="v">{egp2(s.avgOrderValue)}</div><div className="l">Avg Order Value (EGP)</div></div>
        <div className="stat"><div className="v">{egp2(s.avgPerCustomer)}</div><div className="l">Avg Spend / Customer</div></div>
        <div className="stat"><div className="v">{egp(s.totalSales)}</div><div className="l">Total Sales (EGP)</div></div>
        <div className="stat"><div className="v">{s.totalOrders}</div><div className="l">Total Orders</div></div>
        <div className="stat"><div className="v">{s.repeatCustomers}</div><div className="l">Repeat Customers</div></div>
        <div className="stat"><div className="v">{s.cancelRate.toFixed(1)}%</div><div className="l">Cancellation Rate</div></div>
      </div>

      {/* revenue trend */}
      <div className="kcard">
        <h2 className="kh">Revenue — Last 14 Days</h2>
        <LineChart points={s.last14} />
        <div className="kline-x">
          {s.last14.map((p, i) => <span key={i}>{new Date(p.d).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</span>)}
        </div>
      </div>

      <div className="kgrid2">
        {/* top items */}
        <div className="kcard">
          <h2 className="kh">Top 10 Most Ordered Items</h2>
          {s.topItems.length === 0 ? <p className="kmuted">No orders yet.</p> :
            s.topItems.map((it, i) => (
              <BarRow key={i} label={it.name} value={it.qty} max={topMax} sub={`${it.qty} × · ${egp(it.revenue)}`} />
            ))}
        </div>

        {/* category sales */}
        <div className="kcard">
          <h2 className="kh">Sales by Category</h2>
          {s.byCategory.length === 0 ? <p className="kmuted">No orders yet.</p> :
            s.byCategory.map((c, i) => (
              <BarRow key={i} label={c.name} value={c.revenue} max={catMax} sub={egp(c.revenue)} />
            ))}
        </div>
      </div>

      <div className="kgrid2">
        {/* peak hours */}
        <div className="kcard">
          <h2 className="kh">Revenue by Hour (Peak Times)</h2>
          <div className="khours">
            {s.byHour.length === 0 ? <p className="kmuted">No orders yet.</p> :
              s.byHour.map((h, i) => (
                <div className="khour" key={i} title={`${egp(h.t)} EGP · ${h.n} orders`}>
                  <span className="khour-bar" style={{ height: `${Math.max(4, (h.t / hourMax) * 100)}%` }} />
                  <span className="khour-lbl">{String(h.h).padStart(2, "0")}</span>
                </div>
              ))}
          </div>
        </div>

        {/* busiest tables */}
        <div className="kcard">
          <h2 className="kh">Busiest Tables</h2>
          {s.byTable.length === 0 ? <p className="kmuted">No orders yet.</p> :
            s.byTable.map((t, i) => (
              <BarRow key={i} label={`Table ${t.name}`} value={t.revenue} max={tableMax} sub={`${t.orders} orders · ${egp(t.revenue)}`} />
            ))}
        </div>
      </div>

      {/* slow movers */}
      <div className="kcard">
        <h2 className="kh">Slowest Movers <span className="kmuted" style={{ fontWeight: 400, fontSize: ".8rem" }}>— consider promoting or removing</span></h2>
        <div className="table-wrap"><table className="adm">
          <thead><tr><th>Item</th><th>Qty Sold</th></tr></thead>
          <tbody>{s.slowItems.map((it, i) => <tr key={i}><td>{it.name}</td><td>{it.qty}</td></tr>)}</tbody>
        </table></div>
      </div>

      {/* service ratings */}
      <div className="kcard">
        <h2 className="kh">Service Ratings {ratings && ratings.count > 0 && (
          <span className="kmuted" style={{ fontWeight: 400, fontSize: ".85rem" }}>
            — {ratings.average.toFixed(1)} ★ average across {ratings.count}
          </span>
        )}</h2>
        {!ratings || ratings.count === 0 ? <p className="kmuted">No ratings yet.</p> : (
          <div className="table-wrap"><table className="adm">
            <thead><tr><th>When</th><th>Table</th><th>Customer</th><th>Score</th><th>Comment</th></tr></thead>
            <tbody>{ratings.ratings.map(r => (
              <tr key={r.RatingId}>
                <td>{new Date(r.CreatedAt).toLocaleString()}</td>
                <td>{r.TableName || "—"}</td>
                <td>{r.CustomerName || "—"}</td>
                <td>{"★".repeat(r.Score)}<span style={{ color: "#D9D2C8" }}>{"★".repeat(5 - r.Score)}</span></td>
                <td>{r.Comment || "—"}</td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </div>

    </AdminShell>
  );
}
