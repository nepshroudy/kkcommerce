"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

type Discount = {
  id: number; code: string; description?: string | null; type: "PERCENTAGE" | "FIXED"; value: number;
  minimumOrder?: number | null; maximumDiscount?: number | null; usageLimit?: number | null; usageCount: number;
  perCustomerLimit?: number | null; startsAt?: string | null; expiresAt?: string | null; active: boolean;
};

const empty = { code: "", description: "", type: "PERCENTAGE", value: "", minimumOrder: "", maximumDiscount: "", usageLimit: "", perCustomerLimit: "1", startsAt: "", expiresAt: "", active: true };

export default function DiscountsPage() {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { setDiscounts(await api<Discount[]>("/discounts", { authenticated: true })); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to load discounts"); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  function update(name: string, value: string | boolean) { setForm((current) => ({ ...current, [name]: value })); }
  function reset() { setForm(empty); setEditing(null); }
  function edit(d: Discount) {
    setEditing(d.id); setForm({ code: d.code, description: d.description || "", type: d.type, value: String(d.value), minimumOrder: d.minimumOrder ?? "", maximumDiscount: d.maximumDiscount ?? "", usageLimit: d.usageLimit ?? "", perCustomerLimit: d.perCustomerLimit ?? "", startsAt: d.startsAt ? d.startsAt.slice(0, 16) : "", expiresAt: d.expiresAt ? d.expiresAt.slice(0, 16) : "", active: d.active } as typeof empty);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const payload = { ...form, value: Number(form.value), minimumOrder: form.minimumOrder, maximumDiscount: form.maximumDiscount, usageLimit: form.usageLimit, perCustomerLimit: form.perCustomerLimit, startsAt: form.startsAt || null, expiresAt: form.expiresAt || null };
      await api(editing ? `/discounts/${editing}` : "/discounts", { method: editing ? "PATCH" : "POST", authenticated: true, body: JSON.stringify(payload) });
      setMessage(editing ? "Discount updated." : "Discount created."); reset(); await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to save discount"); }
    finally { setBusy(false); }
  }

  async function toggle(d: Discount) {
    try { await api(`/discounts/${d.id}`, { method: "PATCH", authenticated: true, body: JSON.stringify({ active: !d.active }) }); await load(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to update discount"); }
  }
  async function remove(d: Discount) {
    if (!window.confirm(`Delete ${d.code}? Used discounts will be deactivated instead.`)) return;
    try { const result = await api<{ message: string }>(`/discounts/${d.id}`, { method: "DELETE", authenticated: true }); setMessage(result.message); await load(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to delete discount"); }
  }

  return <section>
    <div className="admin-page-heading"><div><p className="eyebrow">PROMOTIONS</p><h1>Discount codes</h1><p className="muted">Create controlled offers for checkout.</p></div></div>
    {error && <div className="error-box">{error}</div>}{message && <div className="success-box">{message}</div>}
    <form className="admin-card discount-form" onSubmit={submit}>
      <div className="discount-form-grid">
        <label>Code<input required value={form.code} onChange={(e) => update("code", e.target.value.toUpperCase())} placeholder="WELCOME10" /></label>
        <label>Type<select value={form.type} onChange={(e) => update("type", e.target.value)}><option value="PERCENTAGE">Percentage</option><option value="FIXED">Fixed amount</option></select></label>
        <label>Value<input required min="0.01" step="0.01" type="number" value={form.value} onChange={(e) => update("value", e.target.value)} /></label>
        <label>Minimum order (£)<input min="0" step="0.01" type="number" value={form.minimumOrder} onChange={(e) => update("minimumOrder", e.target.value)} /></label>
        <label>Maximum discount (£)<input min="0" step="0.01" type="number" value={form.maximumDiscount} onChange={(e) => update("maximumDiscount", e.target.value)} disabled={form.type === "FIXED"} /></label>
        <label>Total usage limit<input min="1" type="number" value={form.usageLimit} onChange={(e) => update("usageLimit", e.target.value)} /></label>
        <label>Per-customer limit<input min="1" type="number" value={form.perCustomerLimit} onChange={(e) => update("perCustomerLimit", e.target.value)} /></label>
        <label>Starts at<input type="datetime-local" value={form.startsAt} onChange={(e) => update("startsAt", e.target.value)} /></label>
        <label>Expires at<input type="datetime-local" value={form.expiresAt} onChange={(e) => update("expiresAt", e.target.value)} /></label>
        <label className="discount-description">Description<input value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="Optional internal/customer-facing note" /></label>
        <label className="checkbox-label"><input type="checkbox" checked={form.active} onChange={(e) => update("active", e.target.checked)} /> Active</label>
      </div>
      <div className="form-actions"><button className="primary-button" disabled={busy}>{busy ? "Saving..." : editing ? "Update discount" : "Create discount"}</button>{editing && <button type="button" className="secondary-button" onClick={reset}>Cancel</button>}</div>
    </form>

    <div className="admin-card table-wrap"><table><thead><tr><th>Code</th><th>Offer</th><th>Minimum</th><th>Usage</th><th>Schedule</th><th>Status</th><th>Actions</th></tr></thead><tbody>
      {discounts.map((d) => <tr key={d.id}><td><strong>{d.code}</strong><br/><small>{d.description || "—"}</small></td><td>{d.type === "PERCENTAGE" ? `${d.value}%` : `£${d.value.toFixed(2)}`}</td><td>{d.minimumOrder == null ? "—" : `£${d.minimumOrder.toFixed(2)}`}</td><td>{d.usageCount}{d.usageLimit == null ? " / ∞" : ` / ${d.usageLimit}`}</td><td><small>{d.startsAt ? new Date(d.startsAt).toLocaleString() : "Immediately"}<br/>{d.expiresAt ? `to ${new Date(d.expiresAt).toLocaleString()}` : "No expiry"}</small></td><td><span className={`status-pill ${d.active ? "status-active" : ""}`}>{d.active ? "ACTIVE" : "INACTIVE"}</span></td><td className="table-actions"><button onClick={() => edit(d)}>Edit</button><button onClick={() => toggle(d)}>{d.active ? "Disable" : "Enable"}</button><button onClick={() => remove(d)}>Delete</button></td></tr>)}
      {!discounts.length && <tr><td colSpan={7}>No discounts created yet.</td></tr>}
    </tbody></table></div>
  </section>;
}
