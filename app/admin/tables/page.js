"use client";
import { useEffect, useState } from "react";
import AdminShell from "../AdminShell";

export default function TablesPage() {
  const [tables, setTables] = useState([]);
  const [f, setF] = useState({ Name: "", DisplayOrder: 0, IsActive: 1 });
  const [editId, setEditId] = useState(null);
  const [msg, setMsg] = useState("");
  const load = () => fetch("/api/admin/tables").then(r => r.json()).then(d => setTables(d.tables));
  useEffect(() => { load(); }, []);
  const save = async () => {
    const url = editId ? `/api/admin/tables/${editId}` : "/api/admin/tables";
    const res = await fetch(url, { method: editId ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
    const d = await res.json();
    setMsg(res.ok ? "Saved." : d.error);
    if (res.ok) { setF({ Name: "", DisplayOrder: 0, IsActive: 1 }); setEditId(null); load(); }
  };
  const del = async (id) => {
    if (!confirm("Delete this table? It will no longer appear as an option when customers order.")) return;
    await fetch(`/api/admin/tables/${id}`, { method: "DELETE" }); load();
  };
  return (
    <AdminShell>
      <h1>Tables</h1>
      <p style={{ marginBottom: "1rem", opacity: .8 }}>These are the table options customers pick from on the Order page. Only active tables appear there.</p>
      <div className="card" style={{ maxWidth: 480, marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1rem", marginBottom: ".8rem" }}>{editId ? "Edit Table" : "Add Table"}</h2>
        {msg && <p className="ok-msg">{msg}</p>}
        <div className="field"><label>Table Name / Number</label><input value={f.Name} onChange={e => setF({ ...f, Name: e.target.value })} placeholder="e.g. 12, or Patio 3" /></div>
        <div className="field"><label>Display Order</label><input type="number" value={f.DisplayOrder} onChange={e => setF({ ...f, DisplayOrder: +e.target.value })} /></div>
        <div className="field"><label><input type="checkbox" checked={!!f.IsActive} onChange={e => setF({ ...f, IsActive: e.target.checked ? 1 : 0 })} /> Active (visible to customers)</label></div>
        <button className="btn" onClick={save}>{editId ? "Save Changes" : "Add Table"}</button>
        {editId && <button className="btn ghost" style={{ marginLeft: ".6rem" }} onClick={() => { setEditId(null); setF({ Name: "", DisplayOrder: 0, IsActive: 1 }); }}>Cancel</button>}
      </div>
      <div className="table-wrap"><table className="adm">
        <thead><tr><th>Order</th><th>Name</th><th>Active</th><th /></tr></thead>
        <tbody>{tables.map(t => (
          <tr key={t.TableId}>
            <td>{t.DisplayOrder}</td><td>{t.Name}</td><td>{t.IsActive ? "Yes" : "No"}</td>
            <td>
              <button className="btn small ghost" onClick={() => { setEditId(t.TableId); setF(t); }}>Edit</button>{" "}
              <button className="btn small danger" onClick={() => del(t.TableId)}>Delete</button>
            </td>
          </tr>
        ))}</tbody>
      </table></div>
    </AdminShell>
  );
}
