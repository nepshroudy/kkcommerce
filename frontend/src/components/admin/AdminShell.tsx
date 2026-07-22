"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { clearSession, getStoredUser } from "@/lib/auth";

const links = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/discounts", label: "Discounts" },
];

export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const user = getStoredUser();
    if (!user || !["SUPERADMIN", "ADMIN"].includes(user.role)) {
      router.replace("/login");
      return;
    }
    setReady(true);
  }, [router]);

  if (!ready) return <main className="admin-loading">Checking admin access...</main>;

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Link className="admin-brand" href="/admin">KK<span>COMMERCE</span></Link>
        <nav>
          {links.map((link) => (
            <Link key={link.href} className={pathname === link.href ? "active" : ""} href={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>
        <button onClick={() => { clearSession(); router.push("/login"); }}>Sign out</button>
      </aside>
      <main className="admin-main">{children}</main>
    </div>
  );
}
