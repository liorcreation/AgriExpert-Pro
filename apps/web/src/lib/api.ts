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

  const headers = new Headers({ Accept: 'application/json', ...(init?.headers ?? {}) });
  if (!(init?.body instanceof FormData) && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers,
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
  status?: 'open' | 'answered' | 'closed';
  answer_count?: number;
  useful_count?: number;
  diagnosis_id?: number | null;
  answer?: { id: number; body: string; language: 'fr' | 'mo'; certified: number; created_at: string; expert_name: string; expert_role?: string; expert_profile?: string } | null;
};

export function listQuestions() {
  return request<{ data: PersistedQuestion[]; total: number }>('/questions');
}

export type UploadedMedia = { id: number; kind: 'photo' | 'voice'; file_name?: string; mime_type: string; size_bytes: number };

export async function uploadMedia(file: Blob, kind: 'photo' | 'voice', fileName = 'terrain-media') {
  const form = new FormData();
  form.append('file', file, fileName);
  form.append('kind', kind);
  return request<{ data: UploadedMedia }>('/media', { method: 'POST', body: form, headers: { Accept: 'application/json' } });
}

export type PhotoDiagnosis = {
  id: number;
  media_asset_id: number;
  category: string;
  status: string;
  result: { summary: string; confidence: number; observations: string[]; hypotheses: Array<{ label: string; confidence: number; rationale: string }>; next_steps: string[]; red_flags: string[]; expert_needed: boolean; disclaimer: string };
};

export function analyzePhoto(mediaId: number, category: string, context: string) {
  return request<{ data: PhotoDiagnosis }>('/diagnostics', { method: 'POST', body: JSON.stringify({ mediaId, category, context }) });
}

export function publishQuestion(input: { title: string; body: string; category: string; hasVoice?: boolean; hasPhoto?: boolean; photoName?: string; attachmentIds?: number[]; diagnosisId?: number }) {
  return request<{ data: PersistedQuestion }>('/questions', { method: 'POST', body: JSON.stringify(input) });
}

export type EmergencyReceipt = { data: { id: number; reference: string; status: string } };

export function createEmergency(input: { kind: string; title: string; description: string; priority: string; latitude: number; longitude: number; attachmentIds?: number[] }) {
  return request<EmergencyReceipt>('/emergencies', { method: 'POST', body: JSON.stringify(input) });
}

export type PersistedEmergency = { id: number; reference: string; kind: string; title: string; description: string; priority: string; latitude: number; longitude: number; status: string; created_at: string };

export function listEmergencies() {
  return request<{ data: PersistedEmergency[] }>('/emergencies');
}

export function reactToQuestion(questionId: string, reacted: boolean) {
  return request<{ data: { question_id: number; useful_count: number; reacted: boolean } }>(`/questions/${questionId}/reaction`, { method: reacted ? 'POST' : 'DELETE' });
}

export function answerQuestion(questionId: string, body: string, language: 'fr' | 'mo' = 'fr') {
  return request<{ data: { id: number; question_id: number; body: string; language: 'fr' | 'mo'; certified: number; created_at: string; expert_name: string; expert_role: string; expert_profile?: string } }>(`/questions/${questionId}/answers`, { method: 'POST', body: JSON.stringify({ body, language }) });
}

export function getPreferences() {
  return request<{ data: { language: 'fr' | 'mo'; voice_enabled: number; dark_mode: number } }>('/preferences');
}

export function savePreferences(input: { language: 'fr' | 'mo'; voiceEnabled: boolean; darkMode: boolean }) {
  return request<{ data: { language: 'fr' | 'mo'; voice_enabled: number; dark_mode: number } }>('/preferences', { method: 'PUT', body: JSON.stringify(input) });
}
