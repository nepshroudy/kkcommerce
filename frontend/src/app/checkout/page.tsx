"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { getStoredUser, getToken } from "@/lib/auth";
import { useStore } from "@/components/store/StoreProvider";

type Validation = { code: string; subtotal: number; discountAmount: number; total: number; description?: string | null };

export default function Checkout() {
  const { cart, subtotal, clearCart } = useStore();
  const router = useRouter();
  const user = getStoredUser();
  const [error, setError] = useState("");
  const [discountError, setDiscountError] = useState("");
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const [code, setCode] = useState("");
  const [discount, setDiscount] = useState<Validation | null>(null);
  const [email, setEmail] = useState(user?.email || "");

  async function applyDiscount() {
    setChecking(true); setDiscountError(""); setDiscount(null);
    try {
      const result = await api<Validation>("/discounts/validate", { method: "POST", authenticated: Boolean(getToken()), body: JSON.stringify({ code, subtotal, email }) });
      setDiscount(result); setCode(result.code);
    } catch (caught) { setDiscountError(caught instanceof Error ? caught.message : "Unable to apply discount"); }
    finally { setChecking(false); }
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!cart.length) return; setBusy(true); setError("");
    const f = new FormData(e.currentTarget);
    try {
      const order = await api<{ id: number }>("/orders", { method: "POST", authenticated: Boolean(getToken()), body: JSON.stringify({ customerName: f.get("name"), customerEmail: f.get("email"), shippingAddress: f.get("address"), discountCode: discount?.code || null, items: cart.map((i) => ({ productId: i.product.id, quantity: i.quantity })) }) });
      clearCart(); router.push(`/orders?created=${order.id}`);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to place order"); }
    finally { setBusy(false); }
  }

  const total = discount?.total ?? subtotal;
  return <main className="max-w-5xl mx-auto p-6"><p className="eyebrow">SECURE CHECKOUT</p><h1 className="text-4xl font-bold mb-8">Delivery details</h1>{!cart.length ? <div className="empty-state">Your cart is empty.</div> : <div className="checkout-grid"><form className="card p-6 form-stack" onSubmit={submit}>{error && <div className="error-box">{error}</div>}<label>Full name<input name="name" defaultValue={user?.name || ""} required /></label><label>Email<input name="email" type="email" value={email} onChange={(e) => { setEmail(e.target.value); setDiscount(null); }} required /></label><label>Shipping address<textarea name="address" rows={5} required /></label><button className="primary-button" disabled={busy}>{busy ? "Placing order..." : "Place test order"}</button><p className="muted text-sm">Card payment will be added in the payment phase. This creates a pending test order.</p></form><aside className="order-summary"><h2>Order summary</h2>{cart.map((i) => <div key={i.product.id}><span>{i.product.name} × {i.quantity}</span><strong>£{(Number(i.product.salePrice || i.product.price) * i.quantity).toFixed(2)}</strong></div>)}<hr/><div><span>Subtotal</span><strong>£{subtotal.toFixed(2)}</strong></div><div className="discount-entry"><input placeholder="Discount code" value={code} onChange={(e) => { setCode(e.target.value.toUpperCase()); setDiscount(null); }} /><button type="button" onClick={applyDiscount} disabled={!code.trim() || checking}>{checking ? "Checking..." : "Apply"}</button></div>{discountError && <p className="form-error">{discountError}</p>}{discount && <><p className="discount-success">{discount.code} applied{discount.description ? ` — ${discount.description}` : ""}</p><div><span>Discount</span><strong>-£{discount.discountAmount.toFixed(2)}</strong></div></>}<hr/><div><span>Total</span><strong>£{total.toFixed(2)}</strong></div></aside></div>}</main>;
}
