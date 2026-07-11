"use client";
import { useEffect, useState } from "react";
import AdminShell from "../AdminShell";

export default function CategoriesPage() {
  const [cats, setCats] = useState([]);
  const [f, setF] = useState({ Name: "", DisplayOrder: 0, IsActive: 1 });
  const [editId, setEditId] = useState(null);
  const [msg, setMsg] = useState("");
  const load = () => fetch("/api/admin/categories").then(r => r.json()).then(d => setCats(d.categories));
  useEffect(() => { load(); }, []);
  const save = async () => {
    const url = editId ? `/api/admin/categories/${editId}` : "/api/admin/categories";
    const res = await fetch(url, { method: editId ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
    const d = await res.json();
    setMsg(res.ok ? "Saved." : d.error);
    if (res.ok) { setF({ Name: "", DisplayOrder: 0, IsActive: 1 }); setEditId(null); load(); }
  };
  const del = async (id) => {
    if (!confirm("Delete this category and all its items?")) return;
    await fetch(`/api/admin/categories/${id}`, { method: "DELETE" }); load();
  };
  return (
    <AdminShell>
      <h1>Categories</h1>
      <div className="card" style={{ maxWidth: 480, marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1rem", marginBottom: ".8rem" }}>{editId ? "Edit Category" : "Add Category"}</h2>
        {msg && <p className="ok-msg">{msg}</p>}
        <div className="field"><label>Name</label><input value={f.Name} onChange={e => setF({ ...f, Name: e.target.value })} /></div>
        <div className="field"><label>Display Order</label><input type="number" value={f.DisplayOrder} onChange={e => setF({ ...f, DisplayOrder: +e.target.value })} /></div>
        <div className="field"><label><input type="checkbox" checked={!!f.IsActive} onChange={e => setF({ ...f, IsActive: e.target.checked ? 1 : 0 })} /> Active</label></div>
        <button className="btn" onClick={save}>{editId ? "Save Changes" : "Add Category"}</button>
        {editId && <button className="btn ghost" style={{ marginLeft: ".6rem" }} onClick={() => { setEditId(null); setF({ Name: "", DisplayOrder: 0, IsActive: 1 }); }}>Cancel</button>}
      </div>
      <div className="table-wrap"><table className="adm">
        <thead><tr><th>Order</th><th>Name</th><th>Active</th><th /></tr></thead>
        <tbody>{cats.map(c => (
          <tr key={c.CategoryId}>
            <td>{c.DisplayOrder}</td><td>{c.Name}</td><td>{c.IsActive ? "Yes" : "No"}</td>
            <td>
              <button className="btn small ghost" onClick={() => { setEditId(c.CategoryId); setF(c); }}>Edit</button>{" "}
              <button className="btn small danger" onClick={() => del(c.CategoryId)}>Delete</button>
            </td>
          </tr>
        ))}</tbody>
      </table></div>
    </AdminShell>
  );
}
