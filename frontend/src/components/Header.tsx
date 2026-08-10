"use client";

import Link from "next/link";
import { useState } from "react";

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="kk-header">
      <div className="kk-header-inner">
        <button
          className="mobile-menu-btn"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          ☰
        </button>

        <Link href="/" className="kk-logo">
          KK CLOSET
        </Link>

        <nav className={`kk-nav ${mobileOpen ? "open" : ""}`}>
          <Link href="/shop">Shop</Link>
          <Link href="/collections/dresses">Dresses</Link>
          <Link href="/collections/tops">Tops</Link>
          <Link href="/collections/outerwear">Outerwear</Link>
          <Link href="/collections/accessories">Accessories</Link>
        </nav>

        <div className="kk-actions">
          <button className="icon-btn" aria-label="Search">
            🔍
          </button>

          <Link href="/wishlist" className="icon-btn" aria-label="Wishlist">
            ♡
          </Link>

          <Link href="/account" className="icon-btn" aria-label="Account">
            👤
          </Link>

          <Link href="/cart" className="cart-btn" aria-label="Cart">
            👜
            <span className="cart-count">0</span>
          </Link>
        </div>
      </div>
    </header>
  );
}