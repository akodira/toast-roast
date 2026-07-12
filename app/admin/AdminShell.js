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

// Priority order for where to land someone with multiple roles — an
// Admin+Staff user lands on the full Dashboard, not just Orders.
function defaultPageFor(roles) {
  if (roles.includes(ROLE_ADMIN)) return "/admin";
  if (roles.includes(ROLE_STAFF)) return "/admin/orders";
  if (roles.includes(ROLE_EDITOR)) return "/admin/menu";
  return "/admin/login";
}

export default function AdminShell({ children }) {
  const path = usePathname();
  const router = useRouter();
  const [roles, setRoles] = useState(null);

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.ok ? r.json() : Promise.reject()).then(d => setRoles(d.roles || []))
      .catch(() => router.push("/admin/login"));
  }, [router]);

  // Once we know the roles, bounce away from pages none of this user's
  // roles can use — hiding the nav link isn't the real security boundary
  // (the API routes are), but landing on an empty page is just confusing.
  useEffect(() => {
    if (!roles) return;
    const allowed = ALL_LINKS.find(([href]) => href === path)?.[2];
    if (allowed && !allowed.some(r => roles.includes(r))) router.replace(defaultPageFor(roles));
  }, [roles, path, router]);

  const logout = async () => { await fetch("/api/auth/logout", { method: "POST" }); router.push("/admin/login"); };
  const links = roles ? ALL_LINKS.filter(([, , allowed]) => allowed.some(r => roles.includes(r))) : [];

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
