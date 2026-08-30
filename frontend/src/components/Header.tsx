"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { useStore } from "@/components/store/StoreProvider";

type Category = {
  id: number;
  name: string;
  slug: string;
  imageUrl?: string | null;
  _count?: { products: number };
};

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const menuRef = useRef<HTMLDivElement>(null);
  const { cartCount } = useStore();

  useEffect(() => {
    api<Category[]>("/categories")
      .then(setCategories)
      .catch((error) => {
        console.error("Could not load header categories:", error);
        setCategories([]);
      })
      .finally(() => setCategoriesLoading(false));
  }, []);

  useEffect(() => {
    function handleOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setCategoriesOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  function closeMenus() {
    setMobileOpen(false);
    setCategoriesOpen(false);
  }

  return (
    <header className="kk-header">
      <div className="kk-header-inner">
        <button
          className="mobile-menu-btn"
          onClick={() => setMobileOpen((open) => !open)}
          aria-label="Toggle menu"
          aria-expanded={mobileOpen}
        >
          ☰
        </button>

        <Link href="/" className="kk-logo" onClick={closeMenus}>
  <img
    src="/kkcloset-logo.png"
    alt="KK Closet"
    className="kk-header-logo-image"
  />
</Link>

        <nav className={`kk-nav ${mobileOpen ? "open" : ""}`}>
          <Link href="/shop" onClick={closeMenus}>Shop</Link>

          <div className="kk-nav-dropdown" ref={menuRef}>
            <button
              type="button"
              className="kk-nav-dropdown-trigger"
              onClick={() => setCategoriesOpen((open) => !open)}
              aria-expanded={categoriesOpen}
              aria-haspopup="menu"
            >
              Explore Categories
              <span className={`kk-nav-chevron ${categoriesOpen ? "open" : ""}`}>⌄</span>
            </button>

            {categoriesOpen && (
              <div className="kk-category-menu" role="menu">
                <div className="kk-category-menu-heading">
                  <span>Explore</span>
                  <strong>Shop by category</strong>
                </div>

                <div className="kk-category-menu-grid">
                  {categoriesLoading ? (
                    <span className="kk-category-loading">Loading categories…</span>
                  ) : categories.length === 0 ? (
                    <Link href="/shop" onClick={closeMenus}>Shop all</Link>
                  ) : (
                    categories.map((category) => (
                      <Link
                        key={category.id}
                        href={`/collections/${category.slug}`}
                        onClick={closeMenus}
                        className="kk-category-link"
                      >
                        <span>{category.name}</span>
                        {typeof category._count?.products === "number" && (
                          <small>{category._count.products}</small>
                        )}
                      </Link>
                    ))
                  )}
                </div>

                <Link href="/shop" className="kk-category-shop-all" onClick={closeMenus}>
                  View all products →
                </Link>
              </div>
            )}
          </div>

          <Link href="/new-arrivals" onClick={closeMenus}>New Arrivals</Link>
          <Link href="/hot-selling" onClick={closeMenus}>Hot Selling</Link>
          <Link href="/sale" className="kk-nav-sale" onClick={closeMenus}>Sale</Link>
        </nav>

        <div className="kk-actions">
          <button className="icon-btn" aria-label="Search">⌕</button>
          <Link href="/wishlist" className="icon-btn" aria-label="Wishlist">♡</Link>
          <Link href="/account" className="icon-btn" aria-label="Account">♙</Link>
          <Link
            href="/cart"
            className="cart-btn"
            aria-label={`Cart with ${cartCount} item${cartCount === 1 ? "" : "s"}`}
          >
            ◇
            {cartCount > 0 && (
              <span className="cart-count">{cartCount > 99 ? "99+" : cartCount}</span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
