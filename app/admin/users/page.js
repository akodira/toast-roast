"use client";
import { useEffect, useState } from "react";
import AdminShell from "../AdminShell";

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [f, setF] = useState({ Username: "", Password: "", FullName: "", RoleId: 1 });
  const [msg, setMsg] = useState("");
  const load = () => fetch("/api/admin/users").then(r => r.json()).then(d => setUsers(d.users));
  useEffect(() => { load(); }, []);
  const add = async () => {
    setMsg("");
    const res = await fetch("/api/admin/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
    const d = await res.json();
    setMsg(res.ok ? "User created." : d.error);
    if (res.ok) { setF({ Username: "", Password: "", FullName: "", RoleId: 1 }); load(); }
  };
  const update = async (u, patch) => {
    const res = await fetch(`/api/admin/users/${u.UserId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...u, ...patch }) });
    const d = await res.json();
    setMsg(res.ok ? "Updated." : d.error); load();
  };
  const resetPw = (u) => {
    const p = prompt("New password (min 8 characters):");
    if (p) update(u, { Password: p });
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
        <div className="field"><label>Role</label>
          <select value={f.RoleId} onChange={e => setF({ ...f, RoleId: +e.target.value })}>
            <option value={1}>Admin</option><option value={2}>Staff</option>
          </select></div>
        <button className="btn" onClick={add}>Create User</button>
      </div>
      <div className="table-wrap"><table className="adm">
        <thead><tr><th>Username</th><th>Name</th><th>Role</th><th>Active</th><th /></tr></thead>
        <tbody>{users.map(u => (
          <tr key={u.UserId}>
            <td>{u.Username}</td><td>{u.FullName}</td><td>{u.RoleId === 1 ? "Admin" : "Staff"}</td>
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
