"use client";

import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";
type Category = { id: number; name: string; imageUrl?: string | null; _count?: { products: number } };

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [editing, setEditing] = useState<number | null>(null);
  const [error, setError] = useState("");
  const load = () => api<Category[]>("/categories").then(setCategories).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  async function submit(e: FormEvent) {
    e.preventDefault(); setError("");
    try {
      await api(editing ? `/categories/${editing}` : "/categories", { method: editing ? "PUT" : "POST", authenticated: true, body: JSON.stringify({ name, imageUrl }) });
      setName(""); setImageUrl(""); setEditing(null); load();
    } catch (e) { setError(e instanceof Error ? e.message : "Save failed"); }
  }
  function edit(category: Category) { setEditing(category.id); setName(category.name); setImageUrl(category.imageUrl || ""); }
  async function remove(category: Category) {
    if (!window.confirm(`Delete ${category.name}?`)) return;
    try { await api(`/categories/${category.id}`, { method: "DELETE", authenticated: true }); load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Delete failed"); }
  }

  return <section><div className="page-heading"><div><p className="eyebrow">CATALOGUE</p><h1>Categories</h1></div></div>
    {error && <p className="form-error">{error}</p>}
    <form className="inline-form" onSubmit={submit}><input required placeholder="Category name" value={name} onChange={(e) => setName(e.target.value)} /><input placeholder="Image URL (optional)" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} /><button type="submit">{editing ? "Update" : "Add category"}</button>{editing && <button className="button-secondary" type="button" onClick={() => { setEditing(null); setName(""); setImageUrl(""); }}>Cancel</button>}</form>
    <div className="table-wrap"><table><thead><tr><th>Name</th><th>Products</th><th>Image</th><th>Actions</th></tr></thead><tbody>{categories.map((category) => <tr key={category.id}><td>{category.name}</td><td>{category._count?.products || 0}</td><td>{category.imageUrl ? "Added" : "—"}</td><td className="table-actions"><button onClick={() => edit(category)}>Edit</button><button onClick={() => remove(category)}>Delete</button></td></tr>)}{!categories.length && <tr><td colSpan={4}>No categories yet.</td></tr>}</tbody></table></div>
  </section>;
}
