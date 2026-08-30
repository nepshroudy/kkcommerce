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

export default async function HotSellingPage() {
  let products: Product[] = [];

  try {
    products = await api<Product[]>("/products?featured=true");
  } catch {
    products = [];
  }

  return (
    <main className="kk-merch-page">
      <section className="kk-merch-hero">
        <p className="eyebrow">KK CLOSET</p>
        <h1>Hot Selling</h1>
        <p>Our current spotlight pieces — selected from products marked Featured in Admin.</p>
        <Link href="/shop">Shop all</Link>
      </section>

      {products.length === 0 ? (
        <div className="empty-state">No Hot Selling products have been selected yet.</div>
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
              
            />
          ))}
        </div>
      )}
    </main>
  );
}
