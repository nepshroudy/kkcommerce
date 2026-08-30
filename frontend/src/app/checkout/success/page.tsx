"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { useStore } from "@/components/store/StoreProvider";

export default function CheckoutSuccess() {
  const params = useSearchParams();
  const sessionId = params.get("session_id");
  const { clearCart } = useStore();
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!sessionId) { setError("Missing payment session."); return; }
    api(`/payments/session/${encodeURIComponent(sessionId)}`)
      .then((data: any) => {
        setResult(data);
        if (data.paymentStatus === "paid" || data.order?.paymentStatus === "PAID") clearCart();
      })
      .catch((e) => setError(e.message));
  }, [sessionId]);

  if (error) return <main className="max-w-3xl mx-auto p-6"><div className="checkout-success"><h1>Payment check failed</h1><p>{error}</p><Link href="/account" className="primary-button inline-block">My account</Link></div></main>;
  if (!result) return <main className="max-w-3xl mx-auto p-6"><div className="checkout-success"><h1>Confirming your payment…</h1><p>Please wait while we verify the payment with Stripe.</p></div></main>;

  const paid = result.paymentStatus === "paid" || result.order?.paymentStatus === "PAID";
  return (
    <main className="max-w-3xl mx-auto p-6">
      <div className="checkout-success">
        <p className="eyebrow">{paid ? "PAYMENT CONFIRMED" : "PAYMENT PROCESSING"}</p>
        <h1>{paid ? "Thank you for your order" : "We’re confirming your payment"}</h1>
        {result.order && <p>Order <strong>#{result.order.id}</strong></p>}
        <p>{paid ? "Your payment has been received and your order is ready for fulfilment." : "Your order will update when Stripe confirms the payment."}</p>
        <div className="form-actions">
          <Link className="primary-button inline-block" href="/shop">Continue shopping</Link>
          <Link className="button-secondary inline-block" href="/orders">View orders</Link>
        </div>
      </div>
    </main>
  );
}
