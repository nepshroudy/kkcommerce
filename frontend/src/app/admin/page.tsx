'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';
import { clearSession, getStoredUser } from '../../lib/auth';

type Summary = {
  products: number;
  categories: number;
  customers: number;
  orders: number;
  revenue: number;
};

export default function AdminPage() {
  const router = useRouter();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const user = getStoredUser();
    if (!user || !['SUPERADMIN', 'ADMIN'].includes(user.role)) {
      router.replace('/login');
      return;
    }

    api<Summary>('/dashboard/summary', { authenticated: true })
      .then(setSummary)
      .catch((caught) => {
        setError(caught instanceof Error ? caught.message : 'Unable to load dashboard');
      });
  }, [router]);

  function logout() {
    clearSession();
    router.push('/login');
  }

  const cards = [
    ['Products', summary?.products ?? '—'],
    ['Categories', summary?.categories ?? '—'],
    ['Orders', summary?.orders ?? '—'],
    ['Customers', summary?.customers ?? '—'],
  ];

  return (
    <main className="dashboard-shell">
      <div className="dashboard-heading">
        <div>
          <p className="eyebrow">KKCOMMERCE ADMIN</p>
          <h1>Dashboard</h1>
          <p className="muted">Your store overview and management centre.</p>
        </div>
        <button className="secondary-button" onClick={logout}>Log out</button>
      </div>

      {error && <div className="error-box">{error}</div>}

      <section className="metric-grid">
        {cards.map(([label, value]) => (
          <article className="metric-card" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
        <article className="metric-card revenue-card">
          <span>Paid revenue</span>
          <strong>£{(summary?.revenue ?? 0).toFixed(2)}</strong>
        </article>
      </section>

      <section className="panel">
        <h2>Foundation ready</h2>
        <p className="muted">Authentication, role protection and live dashboard statistics are connected.</p>
      </section>
    </main>
  );
}
