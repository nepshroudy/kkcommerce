"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "../../lib/api";
import { getStoredUser } from "../../lib/auth";

type Summary = {
  products: number;
  categories: number;
  customers: number;
  orders: number;
  revenue: number;
};

export default function AdminPage() {
  const router = useRouter();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const user = getStoredUser();

    if (!user || !["SUPERADMIN", "ADMIN"].includes(user.role)) {
      router.replace("/login");
      return;
    }

    api<Summary>("/dashboard/summary", { authenticated: true })
      .then(setSummary)
      .catch((caught) => {
        setError(
          caught instanceof Error
            ? caught.message
            : "Unable to load dashboard"
        );
      });
  }, [router]);

  const cards = [
    {
      label: "Products",
      value: summary?.products ?? "—",
      hint: "Products in catalogue",
      href: "/admin/products",
      icon: "01",
    },
    {
      label: "Orders",
      value: summary?.orders ?? "—",
      hint: "Orders received",
      href: "/admin/orders",
      icon: "02",
    },
    
    {
      label: "Categories",
      value: summary?.categories ?? "—",
      hint: "Store collections",
      href: "/admin/categories",
      icon: "04",
    },
  ];

  return (
    <div className="kk-admin-dashboard">
      <section className="kk-admin-hero">
        <div>
          <p className="kk-admin-kicker">KK CLOSET · ADMIN CONSOLE</p>
          <h1>Dashboard</h1>
          <p className="kk-admin-intro">
            Store overview, performance and day-to-day management.
          </p>
        </div>

        <div className="kk-admin-hero-badge">
          <span className="kk-admin-status-dot" />
          Store operational
        </div>
      </section>

      {error && <div className="kk-admin-error">{error}</div>}

      <section className="kk-admin-metrics">
        {cards.map((card) => (
          <Link
            href={card.href}
            className="kk-admin-metric-card"
            key={card.label}
          >
            <div className="kk-admin-card-top">
              <span className="kk-admin-card-index">{card.icon}</span>
              <span className="kk-admin-card-arrow">↗</span>
            </div>
            <p>{card.label}</p>
            <strong>{card.value}</strong>
            <small>{card.hint}</small>
          </Link>
        ))}
      </section>

      <section className="kk-admin-dashboard-grid kk-admin-dashboard-grid-single">
        <article className="kk-admin-feature-card kk-admin-revenue-card">
          <div>
            <p className="kk-admin-section-label">PAID REVENUE</p>
            <h2>£{(summary?.revenue ?? 0).toFixed(2)}</h2>
            <p className="kk-admin-card-copy">
              Confirmed paid order revenue currently recorded by KKCommerce.
            </p>
          </div>
          <div className="kk-admin-revenue-mark">KK</div>
        </article>
      </section>

      <section className="kk-admin-bottom-banner">
        <div>
          <p className="kk-admin-section-label">KK CLOSET</p>
          <h2>Contemporary fashion, managed beautifully.</h2>
        </div>

        <a
          href="https://shop.kkcloset.uk"
          target="_blank"
          rel="noopener noreferrer"
        >
          Visit storefront <span>↗</span>
        </a>
      </section>
    </div>
  );
}
