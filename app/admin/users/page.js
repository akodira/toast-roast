"use client";
import { useEffect, useState } from "react";
import AdminShell from "../AdminShell";

const ROLE_OPTIONS = [[1, "Admin"], [2, "Staff"], [3, "Editor"]];
const roleNames = (ids) => ids.map(id => ROLE_OPTIONS.find(([v]) => v === id)?.[1]).filter(Boolean).join(", ") || "—";

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [f, setF] = useState({ Username: "", Password: "", FullName: "", RoleIds: [1] });
  const [msg, setMsg] = useState("");
  const load = () => fetch("/api/admin/users").then(r => r.json()).then(d => setUsers(d.users || []));
  useEffect(() => { load(); }, []);

  const toggleRole = (ids, roleId) => ids.includes(roleId) ? ids.filter(r => r !== roleId) : [...ids, roleId];

  const add = async () => {
    setMsg("");
    if (f.RoleIds.length === 0) return setMsg("Select at least one role.");
    const res = await fetch("/api/admin/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
    const d = await res.json();
    setMsg(res.ok ? "User created." : d.error);
    if (res.ok) { setF({ Username: "", Password: "", FullName: "", RoleIds: [1] }); load(); }
  };
  const update = async (u, patch) => {
    const res = await fetch(`/api/admin/users/${u.UserId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ FullName: u.FullName, RoleIds: u.RoleIds, IsActive: u.IsActive, ...patch }) });
    const d = await res.json();
    setMsg(res.ok ? "Updated." : d.error); load();
  };
  const resetPw = (u) => {
    const p = prompt("New password (min 8 characters):");
    if (p) update(u, { Password: p });
  };
  const renameUser = (u) => {
    const n = prompt("Full name:", u.FullName || "");
    if (n !== null) update(u, { FullName: n });
  };
  const toggleUserRole = (u, roleId) => {
    const next = toggleRole(u.RoleIds, roleId);
    if (next.length === 0) return setMsg("A user needs at least one role.");
    update(u, { RoleIds: next });
  };

  return (
    <AdminShell>
      <h1>Admin Users</h1>
      <div className="card" style={{ maxWidth: 460, marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1rem", marginBottom: ".8rem" }}>Create User</h2>
        {msg && <p className={/created|Updated/.test(msg) ? "ok-msg" : "err"}>{msg}</p>}
        <div className="field"><label>Username</label><input value={f.Username} onChange={e => setF({ ...f, Username: e.target.value })} /></div>
        <div className="field"><label>Full Name</label><input value={f.FullName} onChange={e => setF({ ...f, FullName: e.target.value })} /></div>
        <div className="field"><label>Password (min 8 chars)</label><input type="password" value={f.Password} onChange={e => setF({ ...f, Password: e.target.value })} /></div>
        <div className="field"><label>Roles (a user can hold more than one)</label>
          {ROLE_OPTIONS.map(([id, name]) => (
            <label key={id} style={{ display: "block", fontWeight: 400 }}>
              <input type="checkbox" checked={f.RoleIds.includes(id)} onChange={() => setF({ ...f, RoleIds: toggleRole(f.RoleIds, id) })} /> {name}
            </label>
          ))}
        </div>
        <button className="btn" onClick={add}>Create User</button>
      </div>
      <div className="table-wrap"><table className="adm">
        <thead><tr><th>Username</th><th>Name</th><th>Roles</th><th>Active</th><th /></tr></thead>
        <tbody>{users.map(u => (
          <tr key={u.UserId}>
            <td>{u.Username}</td>
            <td>{u.FullName}{" "}<button className="btn small ghost" onClick={() => renameUser(u)}>Edit</button></td>
            <td>
              {ROLE_OPTIONS.map(([id, name]) => (
                <label key={id} style={{ display: "block", fontWeight: 400, fontSize: ".85rem" }}>
                  <input type="checkbox" checked={u.RoleIds.includes(id)} onChange={() => toggleUserRole(u, id)} /> {name}
                </label>
              ))}
            </td>
            <td>{u.IsActive ? "Yes" : "Disabled"}</td>
            <td>
              <button className="btn small ghost" onClick={() => resetPw(u)}>Reset Password</button>{" "}
              <button className="btn small ghost" onClick={() => update(u, { IsActive: u.IsActive ? 0 : 1 })}>{u.IsActive ? "Disable" : "Enable"}</button>
            </td>
          </tr>
        ))}</tbody>
      </table></div>
    </AdminShell>
  );
}
