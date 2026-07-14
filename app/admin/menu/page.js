"use client";
import { useEffect, useState } from "react";
import AdminShell from "../AdminShell";

const blank = { CategoryId: "", Name: "", Description: "", Price: "", ImageUrl: "", IsAvailable: 1, IsActive: 1, DisplayOrder: 0, IsFeatured: 0 };

export default function MenuAdmin() {
  const [items, setItems] = useState([]);
  const [cats, setCats] = useState([]);
  const [f, setF] = useState(blank);
  const [editId, setEditId] = useState(null);
  const [filterCat, setFilterCat] = useState("");
  const [msg, setMsg] = useState("");
  const [fileKey, setFileKey] = useState(0);
  const resetForm = () => { setF(blank); setEditId(null); setFileKey(k => k + 1); };
  const load = () => {
    fetch("/api/admin/items").then(r => r.json()).then(d => setItems(d.items));
    fetch("/api/admin/categories").then(r => r.json()).then(d => setCats(d.categories));
  };
  useEffect(() => { load(); }, []);
  const save = async () => {
    setMsg("");
    const url = editId ? `/api/admin/items/${editId}` : "/api/admin/items";
    const res = await fetch(url, { method: editId ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
    const d = await res.json();
    setMsg(res.ok ? "Saved." : d.error);
    if (res.ok) { resetForm(); load(); }
  };
  const del = async (id) => { if (!confirm("Delete this item?")) return; await fetch(`/api/admin/items/${id}`, { method: "DELETE" }); load(); };
  const upload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const fd = new FormData(); fd.append("file", file);
    const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
    const d = await res.json();
    if (!res.ok) return setMsg(d.error);
    setF(v => ({ ...v, ImageUrl: d.url }));
    if (editId) {
      // Save immediately — don't let the photo get lost if "Save Changes" is missed.
      await fetch(`/api/admin/items/${editId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...f, ImageUrl: d.url }) });
      setMsg("Photo uploaded and saved.");
      load();
    }
  };
  const shown = filterCat ? items.filter(i => i.CategoryId === +filterCat) : items;
  const catName = (id) => cats.find(c => c.CategoryId === id)?.Name || "";
  return (
    <AdminShell>
      <h1>Menu Items</h1>
      <div className="card" style={{ maxWidth: 560, marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1rem", marginBottom: ".8rem" }}>{editId ? "Edit Item" : "Add Item"}</h2>
        {msg && <p className={msg === "Saved." ? "ok-msg" : "err"}>{msg}</p>}
        <div className="field"><label>Category</label>
          <select value={f.CategoryId} onChange={e => setF({ ...f, CategoryId: +e.target.value })}>
            <option value="">Select…</option>
            {cats.map(c => <option key={c.CategoryId} value={c.CategoryId}>{c.Name}</option>)}
          </select></div>
        <div className="field"><label>Item Name</label><input value={f.Name} onChange={e => setF({ ...f, Name: e.target.value })} /></div>
        <div className="field"><label>Description</label><textarea value={f.Description || ""} onChange={e => setF({ ...f, Description: e.target.value })} /></div>
        <div className="field"><label>Price</label><input type="number" step="0.01" value={f.Price} onChange={e => setF({ ...f, Price: e.target.value })} /></div>
        <div className="field"><label>Image</label><input key={fileKey} type="file" accept="image/*" onChange={upload} />
          {f.ImageUrl && <img src={f.ImageUrl} alt="" style={{ width: 90, marginTop: ".5rem", borderRadius: 8 }} />}</div>
        <div className="field"><label>Display Order</label><input type="number" value={f.DisplayOrder} onChange={e => setF({ ...f, DisplayOrder: +e.target.value })} /></div>
        <div className="field">
          <label><input type="checkbox" checked={!!f.IsAvailable} onChange={e => setF({ ...f, IsAvailable: e.target.checked ? 1 : 0 })} /> Available</label>{" "}
          <label><input type="checkbox" checked={!!f.IsActive} onChange={e => setF({ ...f, IsActive: e.target.checked ? 1 : 0 })} /> Active</label>{" "}
          <label><input type="checkbox" checked={!!f.IsFeatured} onChange={e => setF({ ...f, IsFeatured: e.target.checked ? 1 : 0 })} /> Featured on Homepage</label>
        </div>
        <button className="btn" onClick={save}>{editId ? "Save Changes" : "Add Item"}</button>
        {editId && <button className="btn ghost" style={{ marginLeft: ".6rem" }} onClick={resetForm}>Cancel</button>}
      </div>
      <div className="field" style={{ maxWidth: 300 }}><label>Filter by category</label>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="">All categories</option>
          {cats.map(c => <option key={c.CategoryId} value={c.CategoryId}>{c.Name}</option>)}
        </select></div>
      <div className="table-wrap"><table className="adm">
        <thead><tr><th>Category</th><th>Name</th><th>Price</th><th>Available</th><th>Active</th><th>Featured</th><th /></tr></thead>
        <tbody>{shown.map(i => (
          <tr key={i.MenuItemId}>
            <td>{catName(i.CategoryId)}</td><td>{i.Name}</td><td>{i.Price.toFixed(2)}</td>
            <td>{i.IsAvailable ? "Yes" : "Out of stock"}</td><td>{i.IsActive ? "Yes" : "No"}</td><td>{i.IsFeatured ? "★" : ""}</td>
            <td>
              <button className="btn small ghost" onClick={() => { setEditId(i.MenuItemId); setF(i); window.scrollTo(0, 0); }}>Edit</button>{" "}
              <button className="btn small danger" onClick={() => del(i.MenuItemId)}>Delete</button>
            </td>
          </tr>
        ))}</tbody>
      </table></div>
    </AdminShell>
  );
}
