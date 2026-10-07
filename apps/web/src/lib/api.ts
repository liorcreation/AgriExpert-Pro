const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '');

export const isApiConfigured = Boolean(API_URL);
// The paid vision provider stays opt-in. Until explicitly enabled at build time,
// photos are sent to the human expert workflow without calling OpenAI.
export const isAiDiagnosisEnabled = String(import.meta.env.VITE_ENABLE_AI_DIAGNOSIS ?? '').toLowerCase() === 'true';
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
  photo_asset_id?: number | null;
  voice_asset_id?: number | null;
  status?: 'open' | 'answered' | 'closed';
  answer_count?: number;
  useful_count?: number;
  diagnosis_id?: number | null;
  answer?: { id: number; body: string; language: 'fr' | 'mo'; certified: number; created_at: string; expert_name: string; expert_role?: string; expert_profile?: string } | null;
};

export function listQuestions() {
  return request<{ data: PersistedQuestion[]; total: number }>('/questions');
}

export function mediaUrl(mediaId: number) {
  return API_URL ? `${API_URL}/media/${mediaId}` : '';
}

export type UploadedMedia = { id: number; kind: 'photo' | 'voice'; file_name?: string; mime_type: string; size_bytes: number };

export async function uploadMedia(file: Blob, kind: 'photo' | 'voice', fileName = 'terrain-media', clientRequestId?: string) {
  const form = new FormData();
  form.append('file', file, fileName);
  form.append('kind', kind);
  if (clientRequestId) form.append('client_request_id', clientRequestId);
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

export function publishQuestion(input: { title: string; body: string; category: string; hasVoice?: boolean; hasPhoto?: boolean; photoName?: string; attachmentIds?: number[]; diagnosisId?: number; clientRequestId?: string }) {
  return request<{ data: PersistedQuestion }>('/questions', { method: 'POST', body: JSON.stringify(input) });
}

export type EmergencyExpert = { id: number; name: string; specialty: string; latitude: number; longitude: number; distance_km: number; status: string; last_seen_at?: string | null };
export type EmergencyReceipt = { data: { id: number; reference: string; status: string; assignment_status?: string; assignment?: { expert_name?: string; distance_km?: number; status?: string } | null; fallback_available?: boolean } };

export function createEmergency(input: { kind: string; title: string; description: string; priority: string; latitude: number; longitude: number; attachmentIds?: number[] }) {
  return request<EmergencyReceipt>('/emergencies', { method: 'POST', body: JSON.stringify(input) });
}

export type PersistedEmergency = { id: number; reference: string; kind: string; title: string; description: string; priority: string; latitude: number; longitude: number; status: string; assigned_expert_user_id?: number | null; assigned_expert_name?: string | null; assigned_expert_profile?: string | null; assignment_status?: string | null; assignment_distance_km?: number | null; assignment_expires_at?: string | null; acknowledged_at?: string | null; sla_due_at?: string | null; escalation_count?: number; created_at: string };

export function listEmergencies() {
  return request<{ data: PersistedEmergency[] }>('/emergencies');
}

export function listEmergencyExperts(latitude: number, longitude: number, kind: string) {
  return request<{ data: EmergencyExpert[]; source: string; distance: string }>(`/emergencies/experts?latitude=${encodeURIComponent(latitude)}&longitude=${encodeURIComponent(longitude)}&kind=${encodeURIComponent(kind)}`);
}

export function getEmergencyAvailability() {
  return request<{ data: { user_id: number; is_available: number; latitude?: number | null; longitude?: number | null; radius_km: number; last_seen_at?: string | null } }>('/emergencies/availability');
}

export function updateEmergencyAvailability(input: { isAvailable: boolean; latitude?: number | null; longitude?: number | null; radiusKm?: number }) {
  return request<{ data: { user_id: number; is_available: number; latitude?: number | null; longitude?: number | null; radius_km: number; last_seen_at?: string | null } }>('/emergencies/availability', { method: 'PUT', body: JSON.stringify(input) });
}

export function updateEmergency(id: number, action: 'accept' | 'decline' | 'resolve' | 'close') {
  return request<{ data: PersistedEmergency & { events: Array<{ id: number; status: string; note: string; created_at: string }> } }>(`/emergencies/${id}`, { method: 'PATCH', body: JSON.stringify({ action }) });
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

export type BillingOverview = {
  currentPlan: 'free' | 'pro' | 'institution';
  subscription: { id: number; plan_code: string; status: string; current_period_start?: string | null; current_period_end?: string | null; cancel_at_period_end: number; cancelled_at?: string | null } | null;
  payments: Array<{ id: number; plan_code: string; amount_xof: number; status: string; provider: string; paid_at?: string | null; created_at: string }>;
  isAdmin: boolean;
  checkoutConfigured: boolean;
  storageReady?: boolean;
  plans: Array<{ code: string; name: string; amount_xof?: number | null; billing_interval: string; sales_enabled: boolean; features: string[]; quotas: Record<string, number> }>;
};

export function getBillingOverview() {
  return request<{ data: BillingOverview }>('/billing');
}

export function configureBillingPlan(input: { code: 'pro' | 'institution'; amountXof: number | ''; interval: 'month' | 'year' | 'contract'; salesEnabled: boolean; features: string[]; quotas: Record<string, number> }) {
  return request<{ data: { saved: boolean } }>('/billing', { method: 'POST', body: JSON.stringify({ action: 'configure-plan', ...input }) });
}
