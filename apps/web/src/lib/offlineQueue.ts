export type OfflineDraft = {
  id: string;
  title: string;
  body: string;
  category: string;
  hasVoice: boolean;
  hasPhoto: boolean;
  photoName?: string;
  createdAt: string;
  status: 'queued' | 'synced';
};

const STORAGE_KEY = 'agriexpert-offline-drafts';

function readDrafts(): OfflineDraft[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) as OfflineDraft[] : [];
  } catch {
    return [];
  }
}

function writeDrafts(drafts: OfflineDraft[]) {
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts)); } catch { /* Offline storage can be unavailable. */ }
}

export function queueOfflineDraft(draft: Omit<OfflineDraft, 'id' | 'createdAt' | 'status'>) {
  const next: OfflineDraft = { ...draft, id: `offline-${Date.now()}`, createdAt: new Date().toISOString(), status: 'queued' };
  writeDrafts([next, ...readDrafts()]);
  void navigator.serviceWorker?.ready.then((registration) => (registration as ServiceWorkerRegistration & { sync?: { register: (tag: string) => Promise<void> } }).sync?.register('agriexpert-sync')).catch(() => undefined);
  return next;
}

export function getOfflineDrafts() { return readDrafts(); }

export function syncOfflineDrafts() {
  const drafts = readDrafts();
  if (!drafts.length) return [];
  const synced = drafts.map((draft) => ({ ...draft, status: 'synced' as const }));
  writeDrafts(synced);
  return synced;
}
