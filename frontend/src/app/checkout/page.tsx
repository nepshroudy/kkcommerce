"use client";

import Link from "next/link";
import ProductCard from "@/components/ProductCard";

const collections = [
  {
    title: "Dresses",
    href: "/collections/dresses",
    image: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Tops",
    href: "/collections/tops",
    image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Outerwear",
    href: "/collections/outerwear",
    image: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=900&q=80",
  },
];

const arrivals = [
  {
    name: "Tailored Blazer",
    price: "£42.00",
    image: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=80",
  },
  {
    name: "Satin Midi Dress",
    price: "£36.00",
    image: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=900&q=80",
  },
  {
    name: "Essential Knit Top",
    price: "£22.00",
    image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=80",
  },
  {
    name: "Wide-Leg Trousers",
    price: "£34.00",
    image: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80",
  },
];

export default function HomePage() {
  return (
    <main className="kk-home">
      <section className="hero">
        <div className="hero-overlay" />
        <div className="hero-content">
          <p className="eyebrow">New Collection</p>
          <h1>Elevated Everyday Fashion</h1>
          <p>
            Contemporary pieces curated for confidence, comfort, and timeless
            style.
          </p>
          <div className="hero-actions">
            <Link href="/shop" className="btn-primary">
              Shop New Arrivals
            </Link>
            <Link href="/collections" className="btn-secondary">
              Explore Collections
            </Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <h2>Featured Collections</h2>
          <Link href="/collections">View all</Link>
        </div>

        <div className="collection-grid">
          {collections.map((collection) => (
            <Link
              key={collection.title}
              href={collection.href}
              className="collection-card"
            >
              <img src={collection.image} alt={collection.title} />
              <div className="collection-card-overlay">
                <h3>{collection.title}</h3>
                <span>Shop now</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <h2>New Arrivals</h2>
          <Link href="/shop">Shop all</Link>
        </div>

<div className="product-grid">
  <ProductCard
    id={1}
    name="Tailored Blazer"
    slug="tailored-blazer"
    price={42}
    imageUrl="https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=80"
    stock={12}
    featured
    isNew
  />

  <ProductCard
    id={2}
    name="Satin Midi Dress"
    slug="satin-midi-dress"
    price={42}
    salePrice={36}
    imageUrl="https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=900&q=80"
    stock={8}
    isNew
  />

  <ProductCard
    id={3}
    name="Essential Knit Top"
    slug="essential-knit-top"
    price={22}
    imageUrl="https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=80"
    stock={15}
  />

  <ProductCard
    id={4}
    name="Wide-Leg Trousers"
    slug="wide-leg-trousers"
    price={34}
    imageUrl="https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80"
    stock={3}
  />
</div>

              <div className="product-info">
                <h3>{item.name}</h3>
                <p className="price">{item.price}</p>
                <button className="add-btn">Quick Add</button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="section brand-strip">
        <div className="brand-strip-inner">
          <div>
            <h3>Free UK Delivery</h3>
            <p>On all orders over £35</p>
          </div>
          <div>
            <h3>Secure Checkout</h3>
            <p>Protected payments and encrypted checkout</p>
          </div>
          <div>
            <h3>Curated Collections</h3>
            <p>Modern essentials selected for everyday confidence</p>
          </div>
        </div>
      </section>
    </main>
  );
}