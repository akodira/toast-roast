"use client";
import { useEffect, useState } from "react";
import AdminShell from "../AdminShell";

const ROLE_OPTIONS = [[1, "Admin"], [2, "Staff"], [3, "Editor"]];
const blank = { Username: "", Password: "", FullName: "", RoleIds: [1] };

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [f, setF] = useState(blank);
  const [editId, setEditId] = useState(null);
  const [msg, setMsg] = useState("");
  const load = () => fetch("/api/admin/users").then(r => r.json()).then(d => setUsers(d.users || []));
  useEffect(() => { load(); }, []);

  const toggleRole = (ids, roleId) => ids.includes(roleId) ? ids.filter(r => r !== roleId) : [...ids, roleId];

  const startEdit = (u) => {
    setEditId(u.UserId);
    setF({ Username: u.Username, Password: "", FullName: u.FullName || "", RoleIds: u.RoleIds });
    setMsg("");
    window.scrollTo(0, 0);
  };
  const cancelEdit = () => { setEditId(null); setF(blank); setMsg(""); };

  const save = async () => {
    setMsg("");
    if (f.RoleIds.length === 0) return setMsg("Select at least one role.");
    if (!editId && (!f.Password || f.Password.length < 8)) return setMsg("Password must be at least 8 characters.");
    if (editId && f.Password && f.Password.length < 8) return setMsg("Password must be at least 8 characters.");

    const url = editId ? `/api/admin/users/${editId}` : "/api/admin/users";
    const body = editId
      ? { Username: f.Username, FullName: f.FullName, RoleIds: f.RoleIds, ...(f.Password ? { Password: f.Password } : {}) }
      : f;
    const res = await fetch(url, { method: editId ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await res.json();
    setMsg(res.ok ? (editId ? "User updated." : "User created.") : d.error);
    if (res.ok) { setEditId(null); setF(blank); load(); }
  };

  const toggleActive = async (u) => {
    await fetch(`/api/admin/users/${u.UserId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ IsActive: u.IsActive ? 0 : 1 }) });
    load();
  };

  return (
    <AdminShell>
      <h1>Admin Users</h1>
      <div className="card" style={{ maxWidth: 460, marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1rem", marginBottom: ".8rem" }}>{editId ? `Edit User — ${f.Username}` : "Create User"}</h2>
        {msg && <p className={/created|updated/.test(msg) ? "ok-msg" : "err"}>{msg}</p>}
        <div className="field"><label>Username</label><input value={f.Username} onChange={e => setF({ ...f, Username: e.target.value })} /></div>
        <div className="field"><label>Full Name</label><input value={f.FullName} onChange={e => setF({ ...f, FullName: e.target.value })} /></div>
        <div className="field"><label>{editId ? "New Password (leave blank to keep current)" : "Password (min 8 chars)"}</label>
          <input type="password" value={f.Password} onChange={e => setF({ ...f, Password: e.target.value })} /></div>
        <div className="field"><label>Roles (a user can hold more than one)</label>
          {ROLE_OPTIONS.map(([id, name]) => (
            <label key={id} style={{ display: "block", fontWeight: 400 }}>
              <input type="checkbox" checked={f.RoleIds.includes(id)} onChange={() => setF({ ...f, RoleIds: toggleRole(f.RoleIds, id) })} /> {name}
            </label>
          ))}
        </div>
        <button className="btn" onClick={save}>{editId ? "Save Changes" : "Create User"}</button>
        {editId && <button className="btn ghost" style={{ marginLeft: ".6rem" }} onClick={cancelEdit}>Cancel</button>}
      </div>
      <div className="table-wrap"><table className="adm">
        <thead><tr><th>Username</th><th>Name</th><th>Roles</th><th>Active</th><th /></tr></thead>
        <tbody>{users.map(u => (
          <tr key={u.UserId}>
            <td>{u.Username}</td>
            <td>{u.FullName}</td>
            <td>{ROLE_OPTIONS.filter(([id]) => u.RoleIds.includes(id)).map(([, name]) => name).join(", ") || "—"}</td>
            <td>{u.IsActive ? "Yes" : "Disabled"}</td>
            <td>
              <button className="btn small ghost" onClick={() => startEdit(u)}>Edit</button>{" "}
              <button className="btn small ghost" onClick={() => toggleActive(u)}>{u.IsActive ? "Disable" : "Enable"}</button>
            </td>
          </tr>
        ))}</tbody>
      </table></div>
    </AdminShell>
  );
}
