"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api } from "@/lib/api";
import "./orders-date.css";

type Order = {
  id: number;
  customerName: string;
  customerEmail: string;
  total: string | number;
  status: string;
  createdAt: string;
  items: unknown[];
};

function londonToday() {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const values: Record<string, string> = {};

  for (const part of formatter.formatToParts(new Date())) {
    if (part.type !== "literal") {
      values[part.type] = part.value;
    }
  }

  return `${values.year}-${values.month}-${values.day}`;
}

function prettyDate(value: string) {
  const [year, month, day] = value
    .split("-")
    .map(Number);

  if (!year || !month || !day) return value;

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(
    new Date(
      Date.UTC(year, month - 1, day, 12)
    )
  );
}

function formatOrderTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function AdminOrdersPage() {
  const [selectedDate, setSelectedDate] =
    useState(() => londonToday());
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const today = useMemo(() => londonToday(), []);

  const loadOrders = useCallback(
    async (date: string) => {
      setLoading(true);
      setError("");

      try {
        const result = await api<Order[]>(
          `/admin/orders?date=${encodeURIComponent(
            date
          )}`,
          { authenticated: true }
        );

        setOrders(
          Array.isArray(result) ? result : []
        );
      } catch (err: any) {
        setOrders([]);
        setError(
          err?.message ||
            "Unable to load orders for this date."
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    loadOrders(selectedDate);
  }, [selectedDate, loadOrders]);

  return (
    <section className="orders-date-page">
      <div className="admin-page-heading orders-date-heading">
        <div>
          <p className="eyebrow">Sales</p>
          <h1>Orders</h1>
          <p className="orders-date-subtitle">
            {prettyDate(selectedDate)}
          </p>
        </div>

        <div
          className="orders-date-controls"
          aria-label="Order date filter"
        >
          <label className="orders-date-field">
            <span>Order date</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(event) =>
                setSelectedDate(
                  event.target.value || today
                )
              }
            />
          </label>

          <button
            type="button"
            className="orders-today-button"
            onClick={() => setSelectedDate(today)}
            disabled={selectedDate === today}
          >
            Today
          </button>
        </div>
      </div>

      <div className="orders-date-summary">
        <div>
          <span className="orders-date-summary-label">
            Selected day
          </span>
          <strong>{prettyDate(selectedDate)}</strong>
        </div>

        <div>
          <span className="orders-date-summary-label">
            Orders
          </span>
          <strong>
            {loading ? "—" : orders.length}
          </strong>
        </div>
      </div>

      {error && (
        <p className="error-message">{error}</p>
      )}

      <div className="admin-card table-wrap orders-date-table">
        <table>
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Items</th>
              <th>Total</th>
              <th>Status</th>
              <th>Time</th>
            </tr>
          </thead>

          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td>
                  <Link
                    href={`/admin/orders/${order.id}`}
                  >
                    #{order.id}
                  </Link>
                </td>

                <td>
                  {order.customerName}
                  <br />
                  <small>
                    {order.customerEmail}
                  </small>
                </td>

                <td>
                  {Array.isArray(order.items)
                    ? order.items.length
                    : 0}
                </td>

                <td>
                  £{Number(order.total).toFixed(2)}
                </td>

                <td>
                  <span className="status-pill">
                    {order.status}
                  </span>
                </td>

                <td>
                  {formatOrderTime(
                    order.createdAt
                  )}
                </td>
              </tr>
            ))}

            {!loading &&
              !orders.length &&
              !error && (
                <tr>
                  <td
                    colSpan={6}
                    className="orders-empty"
                  >
                    <strong>
                      No orders for this date.
                    </strong>
                    <span>
                      Choose another date using the
                      calendar above.
                    </span>
                  </td>
                </tr>
              )}

            {loading && (
              <tr>
                <td
                  colSpan={6}
                  className="orders-empty"
                >
                  Loading orders…
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
