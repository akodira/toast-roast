"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

// Each link maps to a section key (see lib/auth.js SECTIONS). Access is
// decided by the user's resolved sections (role presets + per-user overrides),
// returned from /api/auth/me. Hiding a link isn't the security boundary — the
// API routes enforce it — but it keeps the nav honest.
const ALL_LINKS = [
  ["/admin", "Dashboard", "dashboard"],
  ["/admin/orders", "Orders", "orders"],
  ["/admin/invoices", "Invoices", "invoices"],
  ["/admin/tables", "Tables", "tables"],
  ["/admin/menu", "Menu Items", "menu"],
  ["/admin/categories", "Categories", "categories"],
  ["/admin/content", "Website Content", "content"],
  ["/admin/settings", "Tax & Service", "settings"],
  ["/admin/users", "Users", "users"],
];

// Where to land a user: first section they can actually access, in nav order.
function defaultPageFor(sections) {
  const first = ALL_LINKS.find(([, , key]) => sections.includes(key));
  return first ? first[0] : "/admin/login";
}

export default function AdminShell({ children }) {
  const path = usePathname();
  const router = useRouter();
  const [sections, setSections] = useState(null);

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.ok ? r.json() : Promise.reject()).then(d => setSections(d.sections || []))
      .catch(() => router.push("/admin/login"));
  }, [router]);

  // Bounce away from a section this user can't access (nav-hiding alone is
  // just cosmetic; the API routes are the real gate).
  useEffect(() => {
    if (!sections) return;
    const key = ALL_LINKS.find(([href]) => href === path)?.[2];
    if (key && !sections.includes(key)) router.replace(defaultPageFor(sections));
  }, [sections, path, router]);

  const logout = async () => { await fetch("/api/auth/logout", { method: "POST" }); router.push("/admin/login"); };
  const links = sections ? ALL_LINKS.filter(([, , key]) => sections.includes(key)) : [];

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
