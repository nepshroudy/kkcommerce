"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { clearSession, getStoredUser } from "@/lib/auth";

const managerLinks = [
  { href: "/admin", label: "Dashboard", short: "DB" },
  { href: "/admin/products", label: "Products", short: "PR" },
  { href: "/admin/categories", label: "Categories", short: "CT" },
  { href: "/admin/orders", label: "Orders", short: "OR" },
  { href: "/admin/discounts", label: "Discounts", short: "DS" },
  { href: "/admin/shipping", label: "Shipping", short: "SH" },
];

const employeeLinks = [
  { href: "/admin/products", label: "Products", short: "PR" },
  { href: "/admin/orders", label: "Orders", short: "OR" },
];

export default function AdminShell({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [ready, setReady] = useState(false);
  const [userName, setUserName] = useState("Staff");
  const [role, setRole] = useState("");

  useEffect(() => {
    const user = getStoredUser();

    if (
      !user ||
      !["SUPERADMIN", "ADMIN", "EMPLOYEE"].includes(user.role)
    ) {
      router.replace("/login");
      return;
    }

    if (user.role === "EMPLOYEE") {
      const allowed =
        pathname.startsWith("/admin/orders") ||
        pathname.startsWith("/admin/products");

      if (!allowed) {
        router.replace("/admin/orders");
        return;
      }
    }

    if (
      user.role !== "SUPERADMIN" &&
      pathname.startsWith("/admin/staff")
    ) {
      router.replace(
        user.role === "EMPLOYEE"
          ? "/admin/orders"
          : "/admin"
      );
      return;
    }

    setUserName(user.name || "Staff");
    setRole(user.role);
    setReady(true);
  }, [pathname, router]);

  if (!ready) {
    return (
      <main className="kk-admin-loading">
        Loading KK Closet admin…
      </main>
    );
  }

  const links =
    role === "EMPLOYEE"
      ? employeeLinks
      : [
          ...managerLinks.slice(0, 4),
          ...(role === "SUPERADMIN"
            ? [
                {
                  href: "/admin/staff",
                  label: "Employees & Admins",
                  short: "ST",
                },
              ]
            : []),
          ...managerLinks.slice(4),
        ];

  const homeHref =
    role === "EMPLOYEE"
      ? "/admin/orders"
      : "/admin";

  return (
    <div className="admin-shell kk-admin-shell">
      <aside className="admin-sidebar kk-admin-sidebar">
        <div className="kk-admin-brand-wrap">
          <Link
            className="admin-brand kk-admin-brand"
            href={homeHref}
          >
            <span className="kk-admin-monogram">KK</span>
            <span className="kk-admin-brand-copy">
              <strong>CLOSET</strong>
              <small>ADMIN CONSOLE</small>
            </span>
          </Link>
        </div>

        <div className="kk-admin-nav-label">
          MANAGEMENT
        </div>

        <nav>
          {links.map((link) => {
            const active =
              pathname === link.href ||
              (link.href !== "/admin" &&
                pathname.startsWith(
                  `${link.href}/`
                ));

            return (
              <Link
                key={link.href}
                className={
                  active ? "active" : ""
                }
                href={link.href}
              >
                <span className="kk-admin-nav-icon">
                  {link.short}
                </span>
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="kk-admin-sidebar-footer">
          <div className="kk-admin-user">
            <span className="kk-admin-user-avatar">
              {userName
                .trim()
                .charAt(0)
                .toUpperCase()}
            </span>

            <div>
              <strong>{userName}</strong>
              <small>
                {role === "SUPERADMIN"
                  ? "Superadmin"
                  : role === "ADMIN"
                  ? "Administrator"
                  : "Employee"}
              </small>
            </div>
          </div>

          <button
            onClick={() => {
              clearSession();
              router.push("/login");
            }}
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="admin-main kk-admin-main">
        {children}
      </main>
    </div>
  );
}
