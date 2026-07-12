"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

// Keep in sync with lib/auth.js ROLE_* constants.
const ROLE_ADMIN = 1, ROLE_STAFF = 2, ROLE_EDITOR = 3;

const ALL_LINKS = [
  ["/admin", "Dashboard", [ROLE_ADMIN]],
  ["/admin/orders", "Orders", [ROLE_ADMIN, ROLE_STAFF]],
  ["/admin/tables", "Tables", [ROLE_ADMIN, ROLE_STAFF]],
  ["/admin/menu", "Menu Items", [ROLE_ADMIN, ROLE_EDITOR]],
  ["/admin/categories", "Categories", [ROLE_ADMIN, ROLE_EDITOR]],
  ["/admin/content", "Website Content", [ROLE_ADMIN]],
  ["/admin/settings", "Tax & Service", [ROLE_ADMIN]],
  ["/admin/users", "Users", [ROLE_ADMIN]],
];

const DEFAULT_PAGE = { [ROLE_ADMIN]: "/admin", [ROLE_STAFF]: "/admin/orders", [ROLE_EDITOR]: "/admin/menu" };

export default function AdminShell({ children }) {
  const path = usePathname();
  const router = useRouter();
  const [role, setRole] = useState(null);

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.ok ? r.json() : Promise.reject()).then(d => setRole(d.role))
      .catch(() => router.push("/admin/login"));
  }, [router]);

  // Once we know the role, bounce away from pages this role can't use —
  // hiding the nav link isn't a security boundary (the API routes are the
  // real one), but landing on a page with nothing you're allowed to see is
  // just confusing, so send them somewhere useful instead.
  useEffect(() => {
    if (!role) return;
    const allowed = ALL_LINKS.find(([href]) => href === path)?.[2];
    if (allowed && !allowed.includes(role)) router.replace(DEFAULT_PAGE[role] || "/admin/login");
  }, [role, path, router]);

  const logout = async () => { await fetch("/api/auth/logout", { method: "POST" }); router.push("/admin/login"); };
  const links = role ? ALL_LINKS.filter(([, , roles]) => roles.includes(role)) : [];

  return (
    <div className="admin-shell">
      <aside className="admin-side">
        <Link href="/admin" className="brand">T&R Back Office</Link>
        <nav>
          {links.map(([h, l]) => <Link key={h} href={h} className={path === h ? "on" : ""}>{l}</Link>)}
          <a href="#" onClick={(e) => { e.preventDefault(); logout(); }}>Sign out</a>
        </nav>
      </aside>
      <div className="admin-main">{children}</div>
    </div>
  );
}
