"use client";
import { useEffect, useState } from "react";
import AdminShell from "../AdminShell";

const blank = { Name: "", DisplayOrder: 0, IsActive: 1, ImageUrl: "", Note: "",
  ImageLayout: "overlay", ImageFit: "cover", ImageFocusX: 50, ImageFocusY: 50 };

export default function CategoriesPage() {
  const [cats, setCats] = useState([]);
  const [f, setF] = useState(blank);
  const [editId, setEditId] = useState(null);
  const [msg, setMsg] = useState("");
  // Bumping this remounts the file input, clearing the filename the browser
  // holds onto — React state alone can't reset an uncontrolled input.
  const [fileKey, setFileKey] = useState(0);
  const resetForm = () => { setF(blank); setEditId(null); setFileKey(k => k + 1); };
  const load = () => fetch("/api/admin/categories").then(r => r.json()).then(d => setCats(d.categories));
  useEffect(() => { load(); }, []);
  const save = async () => {
    const url = editId ? `/api/admin/categories/${editId}` : "/api/admin/categories";
    const res = await fetch(url, { method: editId ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
    const d = await res.json();
    setMsg(res.ok ? "Saved." : d.error);
    if (res.ok) { resetForm(); load(); }
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
          <label>Category Note</label>
          <p style={{ fontSize: ".76rem", opacity: .65, marginBottom: ".3rem" }}>
            Shown under this category's items on the Menu page — e.g. a VAT line, an allergen warning, or a serving note. Leave blank to show nothing.
          </p>
          <input value={f.Note || ""} onChange={e => setF({ ...f, Note: e.target.value })}
            placeholder="e.g. All prices are subject to a 12% service charge and 14% VAT." />
        </div>
        <div className="field">
          <label>Background Photo (shown behind this category on the Menu page)</label>
          <input key={fileKey} type="file" accept="image/*" onChange={upload} />
          <p style={{ fontSize: ".78rem", opacity: .7, marginTop: ".3rem" }}>
            For a sharp, well-framed result: use a <strong>landscape/wide</strong> photo (not portrait), at least <strong>1600px wide</strong>. A phone camera photo (usually 3000px+) works great — avoid screenshots or images downloaded from WhatsApp/social media, which are heavily compressed and will look soft here.
          </p>
          {f.ImageUrl && <img src={f.ImageUrl} alt="" style={{ width: 140, marginTop: ".5rem", borderRadius: 8 }} />}
          {f.ImageUrl && <div><button className="btn small ghost" style={{ marginTop: ".4rem" }} onClick={() => setF(v => ({ ...v, ImageUrl: "" }))}>Remove Photo</button></div>}
        </div>
        {f.ImageUrl && (
          <>
            <div className="field">
              <label>Image Layout</label>
              <select value={f.ImageLayout || "overlay"} onChange={e => setF({ ...f, ImageLayout: e.target.value })}>
                <option value="overlay">Overlay — text sits on top of the photo</option>
                <option value="split">Split — photo gets its own half, nothing covering it</option>
              </select>
              <p style={{ fontSize: ".76rem", opacity: .65, marginTop: ".3rem" }}>
                Use <strong>Split</strong> when the photo is full of dishes edge-to-edge — nothing gets hidden behind the text.
                Use <strong>Overlay</strong> when the photo has empty space on the left for the text to sit in.
              </p>
            </div>

            <div className="field">
              <label>Image Fit</label>
              <select value={f.ImageFit || "cover"} onChange={e => setF({ ...f, ImageFit: e.target.value })}>
                <option value="cover">Fill the box (crops the edges)</option>
                <option value="contain">Fit whole image (nothing cropped)</option>
              </select>
            </div>

            {f.ImageFit !== "contain" && (
              <div className="field">
                <label>Focus Point — what stays visible when the photo is cropped</label>
                <div style={{ display: "grid", gap: ".6rem" }}>
                  <label style={{ fontWeight: 400, fontSize: ".82rem" }}>
                    Horizontal: {f.ImageFocusX ?? 50}% {(f.ImageFocusX ?? 50) < 34 ? "(left)" : (f.ImageFocusX ?? 50) > 66 ? "(right)" : "(centre)"}
                    <input type="range" min="0" max="100" step="5" value={f.ImageFocusX ?? 50}
                      onChange={e => setF({ ...f, ImageFocusX: +e.target.value })} />
                  </label>
                  <label style={{ fontWeight: 400, fontSize: ".82rem" }}>
                    Vertical: {f.ImageFocusY ?? 50}% {(f.ImageFocusY ?? 50) < 34 ? "(top)" : (f.ImageFocusY ?? 50) > 66 ? "(bottom)" : "(centre)"}
                    <input type="range" min="0" max="100" step="5" value={f.ImageFocusY ?? 50}
                      onChange={e => setF({ ...f, ImageFocusY: +e.target.value })} />
                  </label>
                </div>
              </div>
            )}

            <div className="field">
              <label>Preview</label>
              <div style={{
                position: "relative", height: 150, borderRadius: 8, overflow: "hidden",
                border: "1px solid var(--line)", background: "var(--cream-2)",
              }}>
                <img src={f.ImageUrl} alt="" style={{
                  width: "100%", height: "100%",
                  objectFit: f.ImageFit === "contain" ? "contain" : "cover",
                  objectPosition: `${f.ImageFocusX ?? 50}% ${f.ImageFocusY ?? 50}%`,
                }} />
                {f.ImageLayout !== "split" && (
                  <div style={{
                    position: "absolute", inset: 0,
                    background: "linear-gradient(100deg, var(--cream) 0%, var(--cream) 34%, rgba(248,244,239,.8) 54%, rgba(248,244,239,0) 82%)",
                  }} />
                )}
              </div>
              <p style={{ fontSize: ".76rem", opacity: .65, marginTop: ".3rem" }}>
                Roughly how it will appear on the Menu page. In Overlay, the cream area is where the dish list sits.
              </p>
            </div>
          </>
        )}

        <div className="field"><label><input type="checkbox" checked={!!f.IsActive} onChange={e => setF({ ...f, IsActive: e.target.checked ? 1 : 0 })} /> Active</label></div>
        <button className="btn" onClick={save}>{editId ? "Save Changes" : "Add Category"}</button>
        {editId && <button className="btn ghost" style={{ marginLeft: ".6rem" }} onClick={resetForm}>Cancel</button>}
      </div>
      <div className="table-wrap"><table className="adm">
        <thead><tr><th>Order</th><th>Name</th><th>Photo</th><th>Active</th><th /></tr></thead>
        <tbody>{cats.map(c => (
          <tr key={c.CategoryId}>
            <td>{c.DisplayOrder}</td><td>{c.Name}</td>
            <td>{c.ImageUrl ? <img src={c.ImageUrl} alt="" style={{ width: 50, borderRadius: 6 }} /> : "—"}</td>
            <td>{c.IsActive ? "Yes" : "No"}</td>
            <td>
              <button className="btn small ghost" onClick={() => { setEditId(c.CategoryId); setF({ ...blank, ...c, ImageUrl: c.ImageUrl || "", Note: c.Note || "" }); window.scrollTo(0, 0); }}>Edit</button>{" "}
              <button className="btn small danger" onClick={() => del(c.CategoryId)}>Delete</button>
            </td>
          </tr>
        ))}</tbody>
      </table></div>
    </AdminShell>
  );
}
