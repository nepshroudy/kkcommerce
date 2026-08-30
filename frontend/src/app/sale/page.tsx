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

export default async function SalePage() {
  let products: Product[] = [];

  try {
    const all = await api<Product[]>("/products");
    products = all.filter(
      (p) =>
        p.salePrice != null &&
        Number(p.salePrice) < Number(p.price)
    );
  } catch {
    products = [];
  }

  return (
    <main className="kk-merch-page">
      <section className="kk-merch-hero">
        <p className="eyebrow">KK CLOSET</p>
        <h1>Sale</h1>
        <p>Reduced styles and limited offers, all in one place.</p>
        <Link href="/shop">Shop all</Link>
      </section>

      {products.length === 0 ? (
        <div className="empty-state">
          There are no sale items right now.
        </div>
      ) : (
        <div className="product-grid kk-merch-grid">
          {products.map((p) => (
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
            />
          ))}
        </div>
      )}
    </main>
  );
}
