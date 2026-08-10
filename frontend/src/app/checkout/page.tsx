"use client";

import { useEffect, useMemo, useState } from "react";

const FREE_SHIPPING_THRESHOLD = 35;
const STANDARD_SHIPPING = 3.99;

type CartItem = {
  productId: number;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
};

export default function CheckoutPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountCode, setDiscountCode] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("kk_cart");
    if (stored) {
      try {
        setCart(JSON.parse(stored));
      } catch {}
    }
  }, []);

  const subtotal = useMemo(() => {
    return cart.reduce(
      (sum, item) => sum + Number(item.price) * item.quantity,
      0
    );
  }, [cart]);

  const shipping =
    subtotal >= FREE_SHIPPING_THRESHOLD || subtotal === 0
      ? 0
      : STANDARD_SHIPPING;

  const total = subtotal + shipping;

  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);

  const progress = Math.min(
    100,
    (subtotal / FREE_SHIPPING_THRESHOLD) * 100
  );

  return (
    <main className="checkout-page">
      <div className="checkout-grid">
        <section className="checkout-form">
          <h1>Checkout</h1>

          <div className="shipping-progress">
            {shipping === 0 ? (
              <div className="shipping-success">
                🚚 FREE UK Delivery unlocked!
              </div>
            ) : (
              <div className="shipping-warning">
                Spend <strong>£{remaining.toFixed(2)}</strong> more to
                unlock <strong>FREE UK Delivery</strong>
              </div>
            )}

            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="progress-labels">
              <span>£0</span>
              <span>£35 FREE Delivery</span>
            </div>
          </div>

          <form className="checkout-form-fields">
            <label>
              Full name
              <input type="text" placeholder="Mukunda Poudel" />
            </label>

            <label>
              Email
              <input
                type="email"
                placeholder="you@example.com"
              />
            </label>

            <label>
              Phone number
              <input type="tel" placeholder="07XXXXXXXXX" />
            </label>

            <label>
              Address
              <input type="text" placeholder="Street address" />
            </label>

            <div className="checkout-row">
              <label>
                City
                <input type="text" placeholder="Birmingham" />
              </label>

              <label>
                Postcode
                <input type="text" placeholder="B1 1AA" />
              </label>
            </div>

            <label>
              Discount code
              <div className="discount-row">
                <input
                  value={discountCode}
                  onChange={(e) => setDiscountCode(e.target.value)}
                  placeholder="WELCOME10"
                />
                <button type="button">Apply</button>
              </div>
            </label>
          </form>
        </section>

        <aside className="order-summary">
          <h2>Order Summary</h2>

          <div className="summary-items">
            {cart.length === 0 ? (
              <p>Your cart is empty.</p>
            ) : (
              cart.map((item) => (
                <div
                  key={item.productId}
                  className="summary-item"
                >
                  <div>
                    <strong>{item.name}</strong>
                    <div>Qty {item.quantity}</div>
                  </div>
                  <div>
                    £{(item.price * item.quantity).toFixed(2)}
                  </div>
                </div>
              ))
            )}
          </div>

          <hr />

          <div className="summary-row">
            <span>Subtotal</span>
            <span>£{subtotal.toFixed(2)}</span>
          </div>

          <div className="summary-row">
            <span>Discount</span>
            <span>-£0.00</span>
          </div>

          <div className="summary-row">
            <span>Shipping</span>
            <span>
              {shipping === 0 ? "FREE" : `£${shipping.toFixed(2)}`}
            </span>
          </div>

          <hr />

          <div className="summary-total">
            <span>Total</span>
            <span>£{total.toFixed(2)}</span>
          </div>

          <button className="checkout-button">
            Continue to Payment
          </button>

          <p className="checkout-note">
            Secure checkout. UK delivery in 2-4 working days.
          </p>
        </aside>
      </div>
    </main>
  );
}