"use client";

import { useMemo, useState } from "react";
import ProductGallery, {
  GalleryImage,
} from "@/components/store/ProductGallery";
import ProductPurchasePanel from "@/components/store/ProductPurchasePanel";
import WishlistButton from "@/components/store/WishlistButton";

type ProductImage = {
  id?: number;
  url: string;
  alt?: string | null;
  colour?: string | null;
};

type ProductVariant = {
  active?: boolean;
  colour?: string;
};

type Product = {
  id: number;
  name: string;
  description: string;
  imageUrl?: string | null;
  category?: {
    name?: string | null;
  } | null;
  images?: ProductImage[];
  variants?: ProductVariant[];
  [key: string]: unknown;
};

export default function ProductDetailClient({
  product,
}: {
  product: Product;
}) {
  const variants = (product.variants || []).filter(
    (variant) => variant.active
  );

  const firstColour =
    variants.find((variant) => variant.colour)?.colour || "";

  const [selectedColour, setSelectedColour] =
    useState(firstColour);

  const gallery = useMemo<GalleryImage[]>(() => {
    const databaseImages: GalleryImage[] = (
      product.images || []
    )
      .filter((image) => Boolean(image.url))
      .map((image) => ({
        url: image.url,
        alt: image.alt || product.name,
        colour: image.colour || null,
      }));

    const mainAlreadyIncluded =
      Boolean(product.imageUrl) &&
      databaseImages.some(
        (image) => image.url === product.imageUrl
      );

    if (product.imageUrl && !mainAlreadyIncluded) {
      databaseImages.unshift({
        url: product.imageUrl,
        alt: product.name,
        colour: null,
      });
    }

    const uniqueImages: GalleryImage[] = [];

    for (const image of databaseImages) {
      if (
        !uniqueImages.some(
          (existing) => existing.url === image.url
        )
      ) {
        uniqueImages.push(image);
      }
    }

    return uniqueImages;
  }, [
    product.imageUrl,
    product.images,
    product.name,
  ]);

  return (
    <main className="max-w-6xl mx-auto p-6 product-detail">
      <ProductGallery
        images={gallery}
        productName={product.name}
        selectedColour={selectedColour}
        onColourChange={setSelectedColour}
      />

      <div className="product-info">
        <p className="eyebrow">
          {product.category?.name || "KK CLOSET"}
        </p>

        <h1>{product.name}</h1>

        <ProductPurchasePanel
          product={product as any}
          onColourChange={setSelectedColour}
        />

        <div className="product-actions">
          <WishlistButton productId={product.id} />
        </div>

        <section className="product-description-section">
          <h2>Product Details</h2>

          <p className="description">
            {product.description}
          </p>
        </section>
      </div>
    </main>
  );
}
