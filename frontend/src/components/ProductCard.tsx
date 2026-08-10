"use client";

import Link from "next/link";
import { useMemo } from "react";

type ProductCardProps = {
  id: number;
  name: string;
  slug: string;
  price: number;
  salePrice?: number | null;
  imageUrl?: string | null;
  stock: number;
  featured?: boolean;
  isNew?: boolean;
};

export default function ProductCard({
  id,
  name,
  slug,
  price,
  salePrice,
  imageUrl,
  stock,
  featured,
  isNew,
}: ProductCardProps) {
  const discount = useMemo(() => {
    if (!salePrice || salePrice >= price) return null;
    return Math.round(((price - salePrice) / price) * 100);
  }, [price, salePrice]);

  const displayImage =
    imageUrl ||
    "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=80";

  return (
    <article className="kk-product-card">
      <Link href={`/product/${slug}`} className="kk-product-image-wrap">
        <img
          src={displayImage}
          alt={name}
          className="kk-product-image"
        />

        <div className="kk-product-badges">
          {discount ? (
            <span className="badge badge-sale">-{discount}%</span>
          ) : null}

          {isNew ? <span className="badge badge-new">New</span> : null}

          {featured ? (
            <span className="badge badge-featured">Featured</span>
          ) : null}
        </div>

        <button
          className="kk-wishlist-btn"
          aria-label="Add to wishlist"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          ♡
        </button>
      </Link>

      <div className="kk-product-info">
        <Link href={`/product/${slug}`} className="kk-product-name">
          {name}
        </Link>

        <div className="kk-product-price">
          {salePrice ? (
            <>
              <span className="price-sale">£{salePrice.toFixed(2)}</span>
              <span className="price-original">
                £{price.toFixed(2)}
              </span>
            </>
          ) : (
            <span className="price-regular">£{price.toFixed(2)}</span>
          )}
        </div>

        <div className="kk-product-stock">
          {stock > 10 ? (
            <span className="stock-in">In stock</span>
          ) : stock > 0 ? (
            <span className="stock-low">Only {stock} left</span>
          ) : (
            <span className="stock-out">Sold out</span>
          )}
        </div>

        <button
          className="kk-add-cart-btn"
          disabled={stock === 0}
          onClick={() => {
            console.log("Quick add", id);
          }}
        >
          {stock === 0 ? "Sold Out" : "Quick Add"}
        </button>
      </div>
    </article>
  );
}