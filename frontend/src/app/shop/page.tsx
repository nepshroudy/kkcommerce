import { api } from "@/lib/api";
import ProductCard from "@/components/ProductCard";

export default async function Shop({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  let products: any[] = [];

  try {
    products = await api(
      `/products${q ? `?q=${encodeURIComponent(q)}` : ""}`
    );
  } catch {}

  return (
    <main className="max-w-6xl mx-auto p-6">
      <div className="shop-heading">
        <div>
          <p className="eyebrow">KK CLOSET COLLECTION</p>
          <h1 className="text-4xl font-bold">Shop</h1>
        </div>

        <form>
          <input
            name="q"
            defaultValue={q}
            placeholder="Search products"
          />
          <button>Search</button>
        </form>
      </div>

      {products.length === 0 ? (
        <div className="empty-state">No products found.</div>
      ) : (
        <div className="product-grid">
          {products.map((p: any) => (
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