"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Product = { id: number; name: string; price: string; stock: number; published: boolean; category?: { name: string } | null };

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState("");

  const load = () => api<Product[]>("/products/admin", { authenticated: true }).then(setProducts).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  async function remove(id: number, name: string) {
    if (!window.confirm(`Delete ${name}?`)) return;
    try { await api(`/products/${id}`, { method: "DELETE", authenticated: true }); load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Delete failed"); }
  }

  return <section>
    <div className="page-heading"><div><p className="eyebrow">CATALOGUE</p><h1>Products</h1></div><Link className="button-link" href="/admin/products/new">Add product</Link></div>
    {error && <p className="form-error">{error}</p>}
    <div className="table-wrap"><table><thead><tr><th>Name</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th>Actions</th></tr></thead><tbody>
      {products.map((product) => <tr key={product.id}><td>{product.name}</td><td>{product.category?.name || "—"}</td><td>£{Number(product.price).toFixed(2)}</td><td>{product.stock}</td><td>{product.published ? "Published" : "Draft"}</td><td className="table-actions"><Link href={`/admin/products/${product.id}`}>Edit</Link><button onClick={() => remove(product.id, product.name)}>Delete</button></td></tr>)}
      {!products.length && <tr><td colSpan={6}>No products yet.</td></tr>}
    </tbody></table></div>
  </section>;
}
