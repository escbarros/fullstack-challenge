import { getUser } from '#/lib/auth';

const BASE = import.meta.env.VITE_API_BASE_URL;

interface ApiEnvelope<T> {
  data: T;
  meta: unknown;
  error: { message: string; code: string } | null;
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const user = await getUser();
  const token = user?.access_token ?? null;

  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });

  const envelope: ApiEnvelope<T> = await res.json();
  if (envelope.error) throw new Error(envelope.error.message);
  return envelope.data;
}
