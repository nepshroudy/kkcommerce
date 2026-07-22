'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';

type User = {
  id: number;
  name: string;
  email: string;
  role: 'CUSTOMER' | 'ADMIN' | 'SUPERADMIN';
  createdAt: string;
  _count: {
    orders: number;
    wishlistItems: number;
  };
};

export default function AdminCustomersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadCustomers = useCallback(async () => {
    try {
      setError('');
      const data = await api<User[]>('/admin/customers', {
        authenticated: true,
      });
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load customers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCustomers();
  }, [loadCustomers]);

  async function changeRole(id: number, role: User['role']) {
    try {
      setError('');
      await api(`/admin/customers/${id}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
        authenticated: true,
      });
      await loadCustomers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update role');
    }
  }

  return (
    <section>
      <div className="admin-page-heading">
        <div>
          <p className="eyebrow">People</p>
          <h1>Customers &amp; staff</h1>
        </div>
      </div>

      {error && <p className="error-message">{error}</p>}

      <div className="admin-card table-wrap">
        {loading ? (
          <p>Loading customers...</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Orders</th>
                <th>Wishlist</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>
                    <select
                      value={user.role}
                      onChange={(event) =>
                        void changeRole(
                          user.id,
                          event.target.value as User['role'],
                        )
                      }
                    >
                      <option value="CUSTOMER">CUSTOMER</option>
                      <option value="ADMIN">ADMIN</option>
                      <option value="SUPERADMIN">SUPERADMIN</option>
                    </select>
                  </td>
                  <td>{user._count.orders}</td>
                  <td>{user._count.wishlistItems}</td>
                  <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
