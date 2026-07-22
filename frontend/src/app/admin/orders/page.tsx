'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

type Order = {
  id: number;
  customerName: string;
  customerEmail: string;
  total: string;
  status: string;
  createdAt: string;
  items: unknown[];
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api<Order[]>('/admin/orders', { authenticated: true })
      .then(setOrders)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <section>
      <div className="admin-page-heading">
        <div><p className="eyebrow">Sales</p><h1>Orders</h1></div>
      </div>
      {error && <p className="error-message">{error}</p>}
      <div className="admin-card table-wrap">
        <table>
          <thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th><th>Date</th></tr></thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td><Link href={`/admin/orders/${order.id}`}>#{order.id}</Link></td>
                <td>{order.customerName}<br /><small>{order.customerEmail}</small></td>
                <td>{order.items.length}</td>
                <td>£{Number(order.total).toFixed(2)}</td>
                <td><span className="status-pill">{order.status}</span></td>
                <td>{new Date(order.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
            {!orders.length && !error && <tr><td colSpan={6}>No orders yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
