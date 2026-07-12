"use client";
import { useEffect, useState } from "react";
import AdminShell from "../AdminShell";

const blank = { Name: "", DisplayOrder: 0, IsActive: 1, ImageUrl: "", ImagePosition: "center" };

export default function CategoriesPage() {
  const [cats, setCats] = useState([]);
  const [f, setF] = useState(blank);
  const [editId, setEditId] = useState(null);
  const [msg, setMsg] = useState("");
  const load = () => fetch("/api/admin/categories").then(r => r.json()).then(d => setCats(d.categories));
  useEffect(() => { load(); }, []);
  const save = async () => {
    const url = editId ? `/api/admin/categories/${editId}` : "/api/admin/categories";
    const res = await fetch(url, { method: editId ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
    const d = await res.json();
    setMsg(res.ok ? "Saved." : d.error);
    if (res.ok) { setF(blank); setEditId(null); load(); }
  };
  const del = async (id) => {
    if (!confirm("Delete this category and all its items?")) return;
    await fetch(`/api/admin/categories/${id}`, { method: "DELETE" }); load();
  };
  const upload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const fd = new FormData(); fd.append("file", file);
    const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
    const d = await res.json();
    if (!res.ok) return setMsg(d.error);
    setF(v => ({ ...v, ImageUrl: d.url }));
    if (editId) {
      // Save immediately — don't let the photo get lost if "Save Changes" is missed.
      await fetch(`/api/admin/categories/${editId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...f, ImageUrl: d.url }) });
      setMsg("Photo uploaded and saved.");
      load();
    }
  };
  return (
    <AdminShell>
      <h1>Categories</h1>
      <div className="card" style={{ maxWidth: 480, marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1rem", marginBottom: ".8rem" }}>{editId ? "Edit Category" : "Add Category"}</h2>
        {msg && <p className="ok-msg">{msg}</p>}
        <div className="field"><label>Name</label><input value={f.Name} onChange={e => setF({ ...f, Name: e.target.value })} /></div>
        <div className="field"><label>Display Order</label><input type="number" value={f.DisplayOrder} onChange={e => setF({ ...f, DisplayOrder: +e.target.value })} /></div>
        <div className="field">
          <label>Background Photo (shown behind this category on the Menu page)</label>
          <input type="file" accept="image/*" onChange={upload} />
          {f.ImageUrl && <img src={f.ImageUrl} alt="" style={{ width: 140, marginTop: ".5rem", borderRadius: 8 }} />}
          {f.ImageUrl && <div><button className="btn small ghost" style={{ marginTop: ".4rem" }} onClick={() => setF(v => ({ ...v, ImageUrl: "" }))}>Remove Photo</button></div>}
        </div>
        {f.ImageUrl && (
          <div className="field">
            <label>Photo Focus Point (which part stays visible if the photo gets cropped)</label>
            <select value={f.ImagePosition || "center"} onChange={e => setF({ ...f, ImagePosition: e.target.value })}>
              <option value="top">Top</option>
              <option value="center">Center</option>
              <option value="bottom">Bottom</option>
            </select>
            <p style={{ fontSize: ".78rem", opacity: .7, marginTop: ".3rem" }}>Tall/portrait photos get cropped to fit this wide panel — use this to pick which part shows. For best results, use a wide/landscape photo instead.</p>
          </div>
        )}
        <div className="field"><label><input type="checkbox" checked={!!f.IsActive} onChange={e => setF({ ...f, IsActive: e.target.checked ? 1 : 0 })} /> Active</label></div>
        <button className="btn" onClick={save}>{editId ? "Save Changes" : "Add Category"}</button>
        {editId && <button className="btn ghost" style={{ marginLeft: ".6rem" }} onClick={() => { setEditId(null); setF(blank); }}>Cancel</button>}
      </div>
      <div className="table-wrap"><table className="adm">
        <thead><tr><th>Order</th><th>Name</th><th>Photo</th><th>Active</th><th /></tr></thead>
        <tbody>{cats.map(c => (
          <tr key={c.CategoryId}>
            <td>{c.DisplayOrder}</td><td>{c.Name}</td>
            <td>{c.ImageUrl ? <img src={c.ImageUrl} alt="" style={{ width: 50, borderRadius: 6 }} /> : "—"}</td>
            <td>{c.IsActive ? "Yes" : "No"}</td>
            <td>
              <button className="btn small ghost" onClick={() => { setEditId(c.CategoryId); setF({ ...blank, ...c, ImageUrl: c.ImageUrl || "" }); window.scrollTo(0, 0); }}>Edit</button>{" "}
              <button className="btn small danger" onClick={() => del(c.CategoryId)}>Delete</button>
            </td>
          </tr>
        ))}</tbody>
      </table></div>
    </AdminShell>
  );
}
