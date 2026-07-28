"use client";
import { useEffect, useState } from "react";
import AdminShell from "../AdminShell";

const BLANK = { Name: "", Address: "", Phone: "", TaxPercent: "", ServicePercent: "", IsActive: true };

export default function BranchesPage() {
  const [branches, setBranches] = useState([]);
  const [f, setF] = useState(BLANK);
  const [editId, setEditId] = useState(null);
  const [msg, setMsg] = useState("");
  const load = () => fetch("/api/admin/branches").then(r => r.json()).then(d => setBranches(d.branches || []));
  useEffect(() => { load(); }, []);

  const edit = (b) => {
    setEditId(b.BranchId);
    setF({
      Name: b.Name || "", Address: b.Address || "", Phone: b.Phone || "",
      TaxPercent: b.TaxPercent ?? "", ServicePercent: b.ServicePercent ?? "",
      DisplayOrder: b.DisplayOrder, IsActive: b.IsActive,
    });
    setMsg("");
  };
  const cancel = () => { setEditId(null); setF(BLANK); };

  const save = async () => {
    if (!f.Name.trim()) { setMsg("Branch name is required."); return; }
    const payload = {
      ...f,
      TaxPercent: f.TaxPercent === "" ? null : Number(f.TaxPercent),
      ServicePercent: f.ServicePercent === "" ? null : Number(f.ServicePercent),
    };
    const res = await fetch(editId ? `/api/admin/branches/${editId}` : "/api/admin/branches", {
      method: editId ? "PUT" : "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) { setMsg(editId ? "Branch updated." : "Branch added."); cancel(); load(); }
    else { const d = await res.json().catch(() => ({})); setMsg(d.error || "Could not save."); }
  };

  const importSahel = async (b) => {
    if (b.Categories > 0) { setMsg("That branch already has a menu — import only works on an empty branch."); return; }
    if (!confirm(`Import the Lake Yard – Hacienda Bay menu (18 categories, 146 items) into "${b.Name}"? This can't be auto-undone.`)) return;
    setMsg("Importing menu…");
    // Point the working branch at this row, then import into it.
    await fetch("/api/admin/current-branch", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ branchId: b.BranchId }),
    });
    const res = await fetch("/api/admin/branches/import-menu", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ menu: "sahel" }),
    });
    if (res.ok) { const d = await res.json(); setMsg(`Imported ${d.categories} categories and ${d.items} items into ${b.Name}.`); load(); }
    else { const d = await res.json().catch(() => ({})); setMsg(d.error || "Import failed."); }
  };

  const toggleActive = async (b) => {
    const res = await fetch(`/api/admin/branches/${b.BranchId}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...b, IsActive: !b.IsActive }),
    });
    if (res.ok) load();
  };

  const del = async (b) => {
    if (!confirm(`Delete branch "${b.Name}"? Only allowed if it has no menu, tables, or orders.`)) return;
    const res = await fetch(`/api/admin/branches/${b.BranchId}`, { method: "DELETE" });
    if (res.ok) { setMsg("Branch deleted."); load(); }
    else { const d = await res.json().catch(() => ({})); setMsg(d.error || "Could not delete."); }
  };

  return (
    <AdminShell>
      <h1>Branches</h1>
      <p style={{ color: "var(--muted)", marginTop: "-.4rem", marginBottom: "1.2rem", fontSize: ".9rem" }}>
        Each branch has its own menu, categories, and tables. Add a branch here, then use the branch switcher to build its menu.
      </p>
      {msg && <p className="ok-msg">{msg}</p>}

      <div className="branch-form card">
        <h3 style={{ marginTop: 0 }}>{editId ? "Edit branch" : "Add a new branch"}</h3>
        <div className="branch-grid">
          <div className="field"><label>Branch Name *</label>
            <input value={f.Name} onChange={e => setF({ ...f, Name: e.target.value })} placeholder="e.g. Lake Yard — Hacienda Bay" />
          </div>
          <div className="field"><label>Phone</label>
            <input value={f.Phone} onChange={e => setF({ ...f, Phone: e.target.value })} placeholder="Branch phone (optional)" />
          </div>
          <div className="field branch-wide"><label>Address</label>
            <input value={f.Address} onChange={e => setF({ ...f, Address: e.target.value })} placeholder="Branch address (optional)" />
          </div>
          <div className="field"><label>Tax %</label>
            <input type="number" step="0.01" value={f.TaxPercent} onChange={e => setF({ ...f, TaxPercent: e.target.value })} placeholder="e.g. 14 (blank = default)" />
          </div>
          <div className="field"><label>Service %</label>
            <input type="number" step="0.01" value={f.ServicePercent} onChange={e => setF({ ...f, ServicePercent: e.target.value })} placeholder="e.g. 12 (blank = default)" />
          </div>
          <div className="field"><label><input type="checkbox" checked={!!f.IsActive} onChange={e => setF({ ...f, IsActive: e.target.checked })} /> Active</label></div>
        </div>
        <div style={{ marginTop: ".6rem" }}>
          <button className="btn" onClick={save}>{editId ? "Save Changes" : "Add Branch"}</button>
          {editId && <button className="btn ghost" style={{ marginLeft: ".6rem" }} onClick={cancel}>Cancel</button>}
        </div>
        <p style={{ fontSize: ".76rem", opacity: .6, marginTop: ".6rem" }}>Leave Tax/Service blank to use the restaurant's default rates.</p>
      </div>

      <div className="table-wrap"><table className="adm">
        <thead><tr><th>Branch</th><th>Contact</th><th className="num">Tax/Svc</th><th className="num">Menu</th><th className="num">Tables</th><th>Status</th><th /></tr></thead>
        <tbody>
          {branches.length === 0 && <tr><td colSpan={7} style={{ textAlign: "center", color: "var(--muted)" }}>No branches yet.</td></tr>}
          {branches.map(b => (
            <tr key={b.BranchId}>
              <td><strong>{b.Name}</strong><br /><span style={{ fontSize: ".78rem", color: "var(--muted)" }}>{b.Slug}</span></td>
              <td style={{ fontSize: ".85rem" }}>{b.Phone || "—"}{b.Address ? <><br /><span style={{ color: "var(--muted)" }}>{b.Address}</span></> : null}</td>
              <td className="num">{b.TaxPercent ?? "—"}% / {b.ServicePercent ?? "—"}%</td>
              <td className="num">{b.Categories} cat · {b.Items} items</td>
              <td className="num">{b.Tables}</td>
              <td>{b.IsActive ? <span className="status-pill st-Ready">Active</span> : <span className="status-pill st-Cancelled">Inactive</span>}</td>
              <td style={{ whiteSpace: "nowrap" }}>
                <button className="btn small ghost" onClick={() => edit(b)}>Edit</button>{" "}
                {b.Categories === 0 && <><button className="btn small" onClick={() => importSahel(b)}>Import Sahel Menu</button>{" "}</>}
                <button className="btn small ghost" onClick={() => toggleActive(b)}>{b.IsActive ? "Deactivate" : "Activate"}</button>{" "}
                <button className="btn small danger" onClick={() => del(b)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table></div>
    </AdminShell>
  );
}
