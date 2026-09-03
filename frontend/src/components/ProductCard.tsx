"use client";

import Link from "next/link";
import { useMemo } from "react";

type Props = {
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
  name,
  slug,
  price,
  salePrice,
  imageUrl,
  stock,
  featured,
  isNew,
}: Props) {
  const hasSale =
    typeof salePrice === "number" &&
    salePrice > 0 &&
    salePrice < price;

  const discount = useMemo(() => {
    if (!hasSale || !salePrice) return null;
    return Math.round(((price - salePrice) / price) * 100);
  }, [hasSale, price, salePrice]);

  const currentPrice = hasSale && salePrice ? salePrice : price;

  return (
    <article className="kk-product-card">
      <Link
        href={`/product/${slug}`}
        className="kk-product-image-wrap"
        aria-label={`View ${name}`}
      >
        <img
          src={
            imageUrl ||
            "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=80"
          }
          alt={name}
          className="kk-product-image"
        />

        {(discount || isNew || featured) && (
          <div className="kk-product-badges">
            {discount && (
              <span className="kk-card-badge kk-card-badge-sale">
                {discount}% OFF
              </span>
            )}
            {isNew && (
              <span className="kk-card-badge kk-card-badge-new">New</span>
            )}
            {featured && (
              <span className="kk-card-badge kk-card-badge-featured">
                Featured
              </span>
            )}
          </div>
        )}
      </Link>

      <div className="kk-product-info">
        <Link href={`/product/${slug}`} className="kk-product-name">
          {name}
        </Link>

        <div
          className="kk-product-price-row"
          aria-label={
            hasSale
              ? `Sale price £${currentPrice.toFixed(
                  2
                )}, original price £${price.toFixed(2)}`
              : `Price £${currentPrice.toFixed(2)}`
          }
        >
          <span
            className={
              hasSale ? "kk-price-current kk-price-sale" : "kk-price-current"
            }
          >
            £{currentPrice.toFixed(2)}
          </span>

          {hasSale && (
            <span className="kk-price-was">£{price.toFixed(2)}</span>
          )}

          {discount && (
            <span className="kk-price-saving">Save {discount}%</span>
          )}
        </div>

        <div className="kk-product-stock">
          {stock > 10 ? (
            <span className="kk-stock kk-stock-in">In stock</span>
          ) : stock > 0 ? (
            <span className="kk-stock kk-stock-low">
              Only {stock} left
            </span>
          ) : (
            <span className="kk-stock kk-stock-out">Sold out</span>
          )}
        </div>

        <Link
          href={`/product/${slug}`}
          className="kk-product-options-button"
        >
          {stock === 0 ? "View item" : "Choose options"}
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  );
}
