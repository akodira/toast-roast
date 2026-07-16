"use client";
import { useEffect, useState } from "react";
import AdminShell from "../AdminShell";

const ROLE_OPTIONS = [[1, "Admin"], [4, "Manager"], [2, "Staff"], [3, "Editor"]];

// Mirror of lib/auth.js SECTIONS (key, label, roles that grant by default).
const SECTIONS = [
  ["dashboard", "Dashboard", [1, 4]],
  ["orders", "Orders", [1, 2, 4]],
  ["invoices", "Invoices", [1, 2, 4]],
  ["tables", "Tables", [1, 2, 4]],
  ["menu", "Menu Items", [1, 3]],
  ["categories", "Categories", [1, 3]],
  ["content", "Website Content", [1]],
  ["settings", "Tax & Service", [1]],
  ["users", "Users", [1]],
];
const blank = { Username: "", Password: "", FullName: "", RoleIds: [1], Overrides: {} };

// What sections these roles grant by default (before overrides).
const defaultSections = (roleIds) => {
  const set = {};
  for (const [key, , roles] of SECTIONS) set[key] = roles.some(r => roleIds.includes(r));
  return set;
};

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [f, setF] = useState(blank);
  const [editId, setEditId] = useState(null);
  const [msg, setMsg] = useState("");
  const load = () => fetch("/api/admin/users").then(r => r.json()).then(d => setUsers(d.users || []));
  useEffect(() => { load(); }, []);

  const isAdmin = f.RoleIds.includes(1);
  const defaults = defaultSections(f.RoleIds);
  // Effective access shown in the checkboxes = default, unless an override says otherwise.
  const effective = (key) => (key in f.Overrides) ? f.Overrides[key] : defaults[key];

  const toggleRole = (roleId) =>
    setF(f => ({ ...f, RoleIds: f.RoleIds.includes(roleId) ? f.RoleIds.filter(r => r !== roleId) : [...f.RoleIds, roleId] }));

  const toggleSection = (key) => {
    setF(f => {
      const cur = (key in f.Overrides) ? f.Overrides[key] : defaults[key];
      const next = !cur;
      const ov = { ...f.Overrides };
      // If the new value matches the role default, drop the override (keep it clean).
      if (next === defaults[key]) delete ov[key];
      else ov[key] = next;
      return { ...f, Overrides: ov };
    });
  };

  const startEdit = (u) => {
    setEditId(u.UserId);
    setF({ Username: u.Username, Password: "", FullName: u.FullName || "", RoleIds: u.RoleIds, Overrides: u.Overrides || {} });
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
    const base = { Username: f.Username, FullName: f.FullName, RoleIds: f.RoleIds, Overrides: f.Overrides };
    const body = editId ? { ...base, ...(f.Password ? { Password: f.Password } : {}) } : { ...base, Password: f.Password };
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
              <input type="checkbox" checked={f.RoleIds.includes(id)} onChange={() => toggleRole(id)} /> {name}
            </label>
          ))}
        </div>

        <div className="field">
          <label>Section Access</label>
          <p className="fld-hint">
            Checked = this user can open that section. Boxes start at the role's defaults; tick or untick to customise per user.
            {isAdmin && " Admins always have every section."}
          </p>
          <div className="sec-grid">
            {SECTIONS.map(([key, label]) => {
              const on = isAdmin || effective(key);
              const overridden = !isAdmin && (key in f.Overrides);
              return (
                <label key={key} className={`sec-item${overridden ? " overridden" : ""}`}>
                  <input type="checkbox" checked={on} disabled={isAdmin} onChange={() => toggleSection(key)} />
                  {label}{overridden && <span className="sec-tag">custom</span>}
                </label>
              );
            })}
          </div>
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
