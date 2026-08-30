import Link from "next/link";
import { api } from "@/lib/api";
import ProductCard from "@/components/ProductCard";

type Product = {
  id: number;
  name: string;
  slug: string;
  price: string | number;
  salePrice?: string | number | null;
  imageUrl?: string | null;
  stock: number;
  featured?: boolean;
};

export default async function NewArrivalsPage() {
  let products: Product[] = [];

  try {
    products = (await api<Product[]>("/products")).slice(0, 24);
  } catch {
    products = [];
  }

  return (
    <main className="kk-merch-page">
      <section className="kk-merch-hero">
        <p className="eyebrow">KK CLOSET</p>
        <h1>New Arrivals</h1>
        <p>The latest pieces to land at KK Closet, shown newest first.</p>
        <Link href="/shop">Shop all</Link>
      </section>

      {products.length === 0 ? (
        <div className="empty-state">No new arrivals are available yet.</div>
      ) : (
        <div className="product-grid kk-merch-grid">
          {products.map((p, index) => (
            <ProductCard
              key={p.id}
              id={p.id}
              name={p.name}
              slug={p.slug}
              price={Number(p.price)}
              salePrice={p.salePrice ? Number(p.salePrice) : null}
              imageUrl={p.imageUrl}
              stock={p.stock}
              featured={p.featured}
              isNew={index < 12}
            />
          ))}
        </div>
      )}
    </main>
  );
}
