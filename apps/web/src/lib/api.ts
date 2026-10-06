const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '');

export const isApiConfigured = Boolean(API_URL);

type ApiUser = {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  role: 'producer' | 'expert' | 'institution';
  profile?: string | null;
  plan: 'free' | 'pro' | 'institution';
};

type AuthResponse = { data: { user: ApiUser; token: string } };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!API_URL) throw new Error('API AgriExpert non configurée.');

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });

  const payload = await response.json().catch(() => ({})) as { message?: string; errors?: Record<string, string[]> };
  if (!response.ok) {
    const validationMessage = payload.errors ? Object.values(payload.errors).flat()[0] : undefined;
    throw new Error(validationMessage ?? payload.message ?? 'Une erreur est survenue.');
  }

  return payload as T;
}

export function registerAccount(input: { name: string; email: string; password: string; role: string; profile?: string; plan?: string }) {
  return request<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify({ ...input, password_confirmation: input.password }) });
}

export function loginAccount(input: { identifier: string; method: 'email' | 'phone'; password: string }) {
  return request<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify({ identifier: input.identifier, method: input.method, password: input.password }) });
}

