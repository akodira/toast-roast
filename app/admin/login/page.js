"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Login() {
  const router = useRouter();
  const [f, setF] = useState({ username: "", password: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true); setErr("");
    const res = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
    const d = await res.json();
    if (res.ok) router.push("/admin"); else { setErr(d.error); setBusy(false); }
  };
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "var(--rust-deep)" }}>
      <div className="card" style={{ width: 360 }}>
        <h1 style={{ fontSize: "1.5rem", color: "var(--rust-deep)", marginBottom: "1rem" }}>Back Office Sign In</h1>
        {err && <p className="err" role="alert">{err}</p>}
        <div className="field"><label htmlFor="u">Username</label>
          <input id="u" value={f.username} onChange={e => setF({ ...f, username: e.target.value })} /></div>
        <div className="field"><label htmlFor="p">Password</label>
          <input id="p" type="password" value={f.password} onChange={e => setF({ ...f, password: e.target.value })}
            onKeyDown={e => e.key === "Enter" && submit()} /></div>
        <button className="btn" style={{ width: "100%" }} onClick={submit} disabled={busy}>{busy ? "Signing in…" : "Sign In"}</button>
      </div>
    </main>
  );
}
