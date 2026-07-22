import { getToken } from './auth';

export const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

type ApiOptions = RequestInit & { authenticated?: boolean };

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { authenticated = false, headers, ...requestOptions } = options;
  const token = authenticated ? getToken() : null;

  const response = await fetch(`${API}${path}`, {
    ...requestOptions,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers || {}),
    },
    cache: 'no-store',
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'Request failed');
  }
  return data as T;
}
