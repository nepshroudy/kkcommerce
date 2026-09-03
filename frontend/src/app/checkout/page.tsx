"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useStore } from "@/components/store/StoreProvider";
import PostcodeAddressLookup, {
  CheckoutAddress,
  emptyAddress,
} from "@/components/checkout/PostcodeAddressLookup";


type ShippingMethod = {
  id: number;
  name: string;
  code: string;
  description?: string | null;
  price: number;
  freeOver?: number | null;
  effectivePrice: number;
  estimate?: string | null;
  isDefault: boolean;
};

export default function Checkout() {
  const { cart, subtotal } = useStore();

  const paymentsEnabled =
    process.env.NEXT_PUBLIC_PAYMENTS_ENABLED === "true";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] =
  useState<CheckoutAddress>(emptyAddress);
  const [discountCode, setDiscountCode] = useState("");
  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>([]);
  const [shippingMethodId, setShippingMethodId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    api<ShippingMethod[]>(
      `/shipping/methods?subtotal=${encodeURIComponent(subtotal.toFixed(2))}`
    )
      .then((methods) => {
        setShippingMethods(methods);

        setShippingMethodId((current) => {
          if (current && methods.some((method) => method.id === current)) {
            return current;
          }

          return (
            methods.find((method) => method.isDefault)?.id ||
            methods[0]?.id ||
            null
          );
        });
      })
      .catch((e) => setError(e.message));
  }, [subtotal]);

  const selectedShipping = useMemo(
    () =>
      shippingMethods.find((method) => method.id === shippingMethodId) || null,
    [shippingMethods, shippingMethodId]
  );

  const estimatedTotal =
    subtotal + (selectedShipping?.effectivePrice || 0);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");

    if (
  !address.house ||
  !address.street ||
  !address.city ||
  !address.postcode
) {
  throw new Error(
    "Please enter a complete delivery address."
  );
}

const shippingAddress = [
  `${address.house} ${address.street}`.trim(),
  address.line2,
  address.city,
  address.county,
  address.postcode,
]
  .filter(Boolean)
  .join("\n");

    if (!paymentsEnabled) {
      setError(
        "Online payment is not enabled yet. The store is currently in deployment testing mode."
      );
      return;
    }

    setPlacing(true);

    try {
      if (!shippingMethodId) {
        throw new Error("Please choose a delivery method.");
      }

      const session = await api<{ url: string }>(
        "/payments/checkout-session",
        {
          method: "POST",
          authenticated: true,
          body: JSON.stringify({
            customerName: name,
            customerEmail: email,
            shippingAddress,
            shippingMethodId,
            discountCode: discountCode.trim() || undefined,
            items: cart.map((item) => ({
              productId: item.product.id,
              variantId: item.variant?.id || null,
              quantity: item.quantity,
            })),
          }),
        }
      );

      window.location.href = session.url;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not start payment"
      );
      setPlacing(false);
    }
  }

  if (cart.length === 0) {
    return (
      <main className="checkout-page">
        <div className="checkout-empty">
          <h1>Your bag is empty</h1>
          <p>Add something beautiful before continuing to checkout.</p>

          <Link href="/shop" className="checkout-gold-button">
            Continue shopping
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="checkout-page">
      <div className="checkout-container">
        <div className="checkout-heading">
          <p className="checkout-eyebrow">KK CLOSET</p>

          <h1>Checkout</h1>

          <div className="checkout-breadcrumbs">
            <Link href="/cart">Bag</Link>
            <span>›</span>
            <strong>Checkout</strong>
            <span>›</span>
            <span>Complete</span>
          </div>
        </div>

        {error && (
          <div className="checkout-error">
            {error}
          </div>
        )}

        <div className="checkout-grid">
          <form className="checkout-details-card" onSubmit={submit}>
            <section className="checkout-section">
              <div className="checkout-section-title">
                <span className="checkout-section-number">1</span>

                <div>
                  <p className="checkout-section-kicker">
                    DELIVERY
                  </p>
                  <h2>Delivery details</h2>
                </div>
              </div>

              <div className="checkout-field-grid">
                <label>
                  <span>Full name</span>

                  <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                  />
                </label>

                <label>
                  <span>Email address</span>

                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                  />
                </label>
              </div>

              
<div className="checkout-full-field">
  <span>Delivery address</span>

  <PostcodeAddressLookup
    value={address}
    onChange={setAddress}
  />
</div>
</section>

            <section className="checkout-section checkout-delivery-section">
              <div className="checkout-section-title">
                <span className="checkout-section-number">2</span>

                <div>
                  <p className="checkout-section-kicker">
                    SHIPPING
                  </p>
                  <h2>Delivery method</h2>
                </div>
              </div>

              <fieldset className="checkout-shipping-options">
                {shippingMethods.map((method) => {
                  const selected =
                    shippingMethodId === method.id;

                  return (
                    <label
                      key={method.id}
                      className={`checkout-shipping-option ${
                        selected ? "selected" : ""
                      }`}
                    >
                      <input
                        type="radio"
                        name="shippingMethod"
                        checked={selected}
                        onChange={() =>
                          setShippingMethodId(method.id)
                        }
                      />

                      <span className="checkout-shipping-icon">
                        {method.code === "EXPRESS"
                          ? "⚡"
                          : "↗"}
                      </span>

                      <span className="checkout-shipping-copy">
                        <strong>{method.name}</strong>

                        <small>
                          {method.description ||
                            "Tracked UK delivery"}

                          {method.estimate
                            ? ` · ${method.estimate}`
                            : ""}
                        </small>
                      </span>

                      <b>
                        {method.effectivePrice === 0
                          ? "FREE"
                          : `£${method.effectivePrice.toFixed(
                              2
                            )}`}
                      </b>
                    </label>
                  );
                })}
              </fieldset>
            </section>
          </form>

          <aside className="checkout-summary-card">
            <div className="checkout-summary-heading">
              <div>
                <p className="checkout-section-kicker">
                  YOUR BAG
                </p>
                <h2>Your order</h2>
              </div>

              <span className="checkout-bag-count">
                {cart.reduce(
                  (total, item) =>
                    total + item.quantity,
                  0
                )}
              </span>
            </div>

            <div className="checkout-items">
              {cart.map((item) => (
                <div
                  className="checkout-product-line"
                  key={`${item.product.id}:${
                    item.variant?.id || "base"
                  }`}
                >
                  <div className="checkout-product-copy">
                    <strong>
                      {item.product.name}
                    </strong>

                    {item.variant ? (
                      <small>
                        {item.variant.colour} ·{" "}
                        {item.variant.size} · Qty{" "}
                        {item.quantity}
                      </small>
                    ) : (
                      <small>
                        Qty {item.quantity}
                      </small>
                    )}
                  </div>

                  <strong className="checkout-price">
                    £
                    {(
                      item.unitPrice *
                      item.quantity
                    ).toFixed(2)}
                  </strong>
                </div>
              ))}
            </div>

            <div className="checkout-summary-totals">
              <div>
                <span>Subtotal</span>
                <strong>
                  £{subtotal.toFixed(2)}
                </strong>
              </div>

              <div>
                <span>
                  {selectedShipping?.name ||
                    "Delivery"}
                </span>

                <strong
                  className={
                    selectedShipping?.effectivePrice === 0
                      ? "checkout-free"
                      : ""
                  }
                >
                  {!selectedShipping
                    ? "—"
                    : selectedShipping.effectivePrice === 0
                    ? "FREE"
                    : `£${selectedShipping.effectivePrice.toFixed(
                        2
                      )}`}
                </strong>
              </div>

              <div className="checkout-summary-total">
                <span>Estimated total</span>

                <strong>
                  £{estimatedTotal.toFixed(2)}
                </strong>
              </div>
            </div>

            <div className="checkout-discount">
              <label>
                <span>Discount code</span>

                <div className="checkout-discount-row">
                  <input
                    value={discountCode}
                    onChange={(e) =>
                      setDiscountCode(
                        e.target.value.toUpperCase()
                      )
                    }
                    placeholder="Enter code"
                  />

                  <button
                    type="button"
                    className="checkout-apply-button"
                  >
                    Apply
                  </button>
                </div>
              </label>
            </div>

            <div className="checkout-secure-note">
              <span>✓</span>

              <p>
                Discount codes are verified by the
                server before payment.
              </p>
            </div>

            <button
              type="submit"
              form="checkout-form"
              className="checkout-payment-button"
              disabled={
                !paymentsEnabled ||
                placing ||
                !shippingMethodId
              }
              onClick={submit}
            >
              {!paymentsEnabled
                ? "Payment testing not enabled yet"
                : placing
                ? "Opening secure payment..."
                : "Continue to secure payment"}
            </button>

            <p className="checkout-security">
              Secure checkout · Your information is
              protected
            </p>
          </aside>
        </div>
      </div>
    </main>
  );
}