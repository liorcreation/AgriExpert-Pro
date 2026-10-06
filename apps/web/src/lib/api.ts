const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '');

export const isApiConfigured = Boolean(API_URL);
const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim() ?? '';
export const isGoogleConfigured = Boolean(GOOGLE_CLIENT_ID);

type ApiUser = {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  role: 'producer' | 'expert' | 'institution';
  profile?: string | null;
  plan: 'free' | 'pro' | 'institution';
};

type AuthResponse = { data: { user: ApiUser; token?: string } };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!API_URL) throw new Error('API AgriExpert non configurée.');

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
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

export function currentAccount() {
  return request<{ data: { user: ApiUser } }>('/auth/me');
}

export function logoutAccount() {
  return request<{ message: string }>('/auth/logout', { method: 'POST' });
}

export function loginWithGoogle(credential: string, profile: { role?: string; profile?: string; plan?: string }) {
  return request<AuthResponse>('/auth/google', { method: 'POST', body: JSON.stringify({ credential, ...profile }) });
}

export type PersistedQuestion = {
  id: number;
  category: 'agriculture' | 'livestock' | 'aquaculture' | 'apiculture';
  title: string;
  body: string;
  author_name: string;
  created_at: string;
  has_voice: number;
  has_photo: number;
  photo_name?: string | null;
  answer_count?: number;
};

export function listQuestions() {
  return request<{ data: PersistedQuestion[]; total: number }>('/questions');
}

export function publishQuestion(input: { title: string; body: string; category: string; hasVoice?: boolean; hasPhoto?: boolean; photoName?: string }) {
  return request<{ data: PersistedQuestion }>('/questions', { method: 'POST', body: JSON.stringify(input) });
}

export type EmergencyReceipt = { data: { id: number; reference: string; status: string } };

export function createEmergency(input: { kind: string; title: string; description: string; priority: string; latitude: number; longitude: number }) {
  return request<EmergencyReceipt>('/emergencies', { method: 'POST', body: JSON.stringify(input) });
}
