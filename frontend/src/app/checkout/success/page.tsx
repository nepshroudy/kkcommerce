"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { api } from "@/lib/api";
import { useStore } from "@/components/store/StoreProvider";

type PaymentResult = {
  paymentStatus?: string;
  order?: {
    id?: number;
    paymentStatus?: string;
  };
};

function CheckoutSuccessContent() {
  const params = useSearchParams();
  const sessionId = params.get("session_id");

  const { clearCart } = useStore();

  const [result, setResult] = useState<PaymentResult | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!sessionId) {
      setError("Missing payment session.");
      return;
    }

    let cancelled = false;

    async function verifyPayment() {
      try {
        const data = await api<PaymentResult>(
          `/payments/session/${encodeURIComponent(sessionId as string)}`
        );

        if (cancelled) return;

        setResult(data);

        const paid =
          data.paymentStatus === "paid" ||
          data.order?.paymentStatus === "PAID";

        if (paid) {
          clearCart();
        }
      } catch (err) {
        if (cancelled) return;

        setError(
          err instanceof Error
            ? err.message
            : "Could not verify the payment."
        );
      }
    }

    verifyPayment();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  if (error) {
    return (
      <main className="max-w-3xl mx-auto p-6">
        <div className="checkout-success">
          <p className="eyebrow">KK CLOSET</p>
          <h1>Payment check failed</h1>

          <p>{error}</p>

          <div className="form-actions">
            <Link
              href="/account"
              className="primary-button inline-block"
            >
              My account
            </Link>

            <Link
              href="/shop"
              className="button-secondary inline-block"
            >
              Continue shopping
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (!result) {
    return (
      <main className="max-w-3xl mx-auto p-6">
        <div className="checkout-success">
          <p className="eyebrow">SECURE CHECKOUT</p>

          <h1>Confirming your payment...</h1>

          <p>
            Please wait while we verify your payment.
          </p>
        </div>
      </main>
    );
  }

  const paid =
    result.paymentStatus === "paid" ||
    result.order?.paymentStatus === "PAID";

  return (
    <main className="max-w-3xl mx-auto p-6">
      <div className="checkout-success">
        <p className="eyebrow">
          {paid
            ? "PAYMENT CONFIRMED"
            : "PAYMENT PROCESSING"}
        </p>

        <h1>
          {paid
            ? "Thank you for your order"
            : "We're confirming your payment"}
        </h1>

        {result.order?.id && (
          <p>
            Order <strong>#{result.order.id}</strong>
          </p>
        )}

        <p>
          {paid
            ? "Your payment has been received and your order is ready for fulfilment."
            : "Your order will update when the payment provider confirms the payment."}
        </p>

        <div className="form-actions">
          <Link
            className="primary-button inline-block"
            href="/shop"
          >
            Continue shopping
          </Link>

          <Link
            className="button-secondary inline-block"
            href="/orders"
          >
            View orders
          </Link>
        </div>
      </div>
    </main>
  );
}

function CheckoutSuccessLoading() {
  return (
    <main className="max-w-3xl mx-auto p-6">
      <div className="checkout-success">
        <p className="eyebrow">SECURE CHECKOUT</p>
        <h1>Loading your order...</h1>
        <p>Please wait.</p>
      </div>
    </main>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<CheckoutSuccessLoading />}>
      <CheckoutSuccessContent />
    </Suspense>
  );
}