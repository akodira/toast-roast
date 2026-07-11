"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const links = [
  ["/admin", "Dashboard"], ["/admin/orders", "Orders"], ["/admin/menu", "Menu Items"],
  ["/admin/categories", "Categories"], ["/admin/tables", "Tables"], ["/admin/content", "Website Content"],
  ["/admin/settings", "Tax & Service"], ["/admin/users", "Users"],
];

export default function AdminShell({ children }) {
  const path = usePathname();
  const router = useRouter();
  const logout = async () => { await fetch("/api/auth/logout", { method: "POST" }); router.push("/admin/login"); };
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
