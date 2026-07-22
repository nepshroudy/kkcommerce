"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

type Category = { id: number; name: string };
type Product = {
  id?: number; name: string; description: string; price: string | number; salePrice?: string | number | null;
  sku?: string | null; stock: number; featured: boolean; published: boolean; imageUrl?: string | null;
  categoryId?: number | null; images?: { url: string }[];
};

const blank: Product = { name: "", description: "", price: "", salePrice: "", sku: "", stock: 0, featured: false, published: true, imageUrl: "", categoryId: null, images: [] };

export default function ProductForm({ productId }: { productId?: number }) {
  const router = useRouter();
  const [form, setForm] = useState<Product>(blank);
  const [categories, setCategories] = useState<Category[]>([]);
  const [imageLines, setImageLines] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api<Category[]>("/categories").then(setCategories).catch((e) => setError(e.message));
    if (productId) {
      api<Product>(`/products/admin/${productId}`, { authenticated: true })
        .then((product) => {
          setForm(product);
          setImageLines((product.images || []).map((image) => image.url).join("\n"));
        })
        .catch((e) => setError(e.message));
    }
  }, [productId]);

  const update = (key: keyof Product, value: unknown) => setForm((current) => ({ ...current, [key]: value }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      const body = {
        ...form,
        images: imageLines.split(/\r?\n/).map((line) => line.trim()).filter(Boolean),
      };
      await api(productId ? `/products/${productId}` : "/products", {
        method: productId ? "PUT" : "POST",
        authenticated: true,
        body: JSON.stringify(body),
      });
      router.push("/admin/products");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save product");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="admin-form" onSubmit={submit}>
      {error && <p className="form-error">{error}</p>}
      <div className="form-grid">
        <label>Name<input required value={form.name} onChange={(e) => update("name", e.target.value)} /></label>
        <label>SKU<input value={form.sku || ""} onChange={(e) => update("sku", e.target.value)} /></label>
        <label>Price (£)<input required min="0" step="0.01" type="number" value={form.price} onChange={(e) => update("price", e.target.value)} /></label>
        <label>Sale price (£)<input min="0" step="0.01" type="number" value={form.salePrice || ""} onChange={(e) => update("salePrice", e.target.value)} /></label>
        <label>Stock<input min="0" type="number" value={form.stock} onChange={(e) => update("stock", Number(e.target.value))} /></label>
        <label>Category<select value={form.categoryId || ""} onChange={(e) => update("categoryId", e.target.value ? Number(e.target.value) : null)}><option value="">Uncategorised</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
      </div>
      <label>Description<textarea required rows={6} value={form.description} onChange={(e) => update("description", e.target.value)} /></label>
      <label>Main image URL<input value={form.imageUrl || ""} onChange={(e) => update("imageUrl", e.target.value)} placeholder="https://..." /></label>
      <label>Additional image URLs (one per line)<textarea rows={5} value={imageLines} onChange={(e) => setImageLines(e.target.value)} placeholder="https://..." /></label>
      <div className="check-row">
        <label><input type="checkbox" checked={form.featured} onChange={(e) => update("featured", e.target.checked)} /> Featured</label>
        <label><input type="checkbox" checked={form.published} onChange={(e) => update("published", e.target.checked)} /> Published</label>
      </div>
      <div className="form-actions"><button className="button-secondary" type="button" onClick={() => router.back()}>Cancel</button><button disabled={saving} type="submit">{saving ? "Saving..." : "Save product"}</button></div>
    </form>
  );
}
