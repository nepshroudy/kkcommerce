"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function OrdersContent() {
  const params = useSearchParams();
  const createdOrder = params.get("created") || "";

  return (
    <main className="auth-shell">
      <div className="auth-card text-center">
        <p className="eyebrow">ORDER RECEIVED</p>

        <h1>Thank you</h1>

        {createdOrder ? (
          <p>
            Your test order #{createdOrder} has been created successfully.
          </p>
        ) : (
          <p>Your order has been received.</p>
        )}

        <div className="mt-6">
          <Link
            className="primary-button inline-block"
            href="/account"
          >
            View account
          </Link>
        </div>
      </div>
    </main>
  );
}

function OrdersLoading() {
  return (
    <main className="auth-shell">
      <div className="auth-card text-center">
        <p className="eyebrow">KK CLOSET</p>
        <h1>Loading order...</h1>
      </div>
    </main>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<OrdersLoading />}>
      <OrdersContent />
    </Suspense>
  );
}