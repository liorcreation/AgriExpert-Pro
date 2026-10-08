import { isApiConfigured, publishQuestion, uploadMedia } from './api';

export type OfflineStatus = 'queued' | 'uploading' | 'synced' | 'failed';

export type OfflineDraft = {
  id: string;
  clientRequestId: string;
  title: string;
  body: string;
  category: string;
  hasVoice: boolean;
  hasPhoto: boolean;
  photoName?: string;
  voiceName?: string;
  voiceTranscript?: string;
  photoAssetId?: number;
  photoBlob?: Blob;
  voiceBlob?: Blob;
  voiceAssetId?: number;
  createdAt: string;
  updatedAt: string;
  syncedAt?: string;
  retryCount: number;
  lastError?: string;
  status: OfflineStatus;
};

type StoredDraft = Omit<OfflineDraft, 'photoBlob' | 'voiceBlob'> & {
  photoCipher?: ArrayBuffer;
  photoIv?: ArrayBuffer;
  photoMime?: string;
  voiceCipher?: ArrayBuffer;
  voiceIv?: ArrayBuffer;
  voiceMime?: string;
};

const DB_NAME = 'agriexpert-offline';
const DB_VERSION = 1;
const DRAFT_STORE = 'drafts';
const KEY_STORE = 'keys';
const SYNC_TAG = 'agriexpert-sync';
const STALE_UPLOAD_MS = 5 * 60 * 1000;
let activeSync: Promise<OfflineDraft[]> | null = null;

function requestResult<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed.'));
  });
}

function transactionDone(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed.'));
    transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction aborted.'));
  });
}

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(DRAFT_STORE)) database.createObjectStore(DRAFT_STORE, { keyPath: 'id' });
      if (!database.objectStoreNames.contains(KEY_STORE)) database.createObjectStore(KEY_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB is unavailable.'));
  });
}

async function getDeviceKey(database: IDBDatabase) {
  const readTransaction = database.transaction(KEY_STORE, 'readonly');
  const existing = await requestResult(readTransaction.objectStore(KEY_STORE).get('device-key')) as CryptoKey | undefined;
  if (existing) return existing;
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  const writeTransaction = database.transaction(KEY_STORE, 'readwrite');
  writeTransaction.objectStore(KEY_STORE).put(key, 'device-key');
  await transactionDone(writeTransaction);
  return key;
}

async function encryptBlob(database: IDBDatabase, blob: Blob) {
  const key = await getDeviceKey(database);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, await blob.arrayBuffer());
  return { cipher, iv: iv.buffer.slice(0), mime: blob.type };
}

async function decryptBlob(database: IDBDatabase, cipher: ArrayBuffer, iv: ArrayBuffer, mime: string) {
  const key = await getDeviceKey(database);
  const bytes = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(iv) }, key, cipher);
  return new Blob([bytes], { type: mime || 'application/octet-stream' });
}

async function toStored(database: IDBDatabase, draft: OfflineDraft): Promise<StoredDraft> {
  const { photoBlob, voiceBlob, ...metadata } = draft;
  const stored: StoredDraft = { ...metadata };
  if (photoBlob) {
    const encrypted = await encryptBlob(database, photoBlob);
    stored.photoCipher = encrypted.cipher;
    stored.photoIv = encrypted.iv;
    stored.photoMime = encrypted.mime;
  }
  if (voiceBlob) {
    const encrypted = await encryptBlob(database, voiceBlob);
    stored.voiceCipher = encrypted.cipher;
    stored.voiceIv = encrypted.iv;
    stored.voiceMime = encrypted.mime;
  }
  return stored;
}

async function fromStored(database: IDBDatabase, stored: StoredDraft): Promise<OfflineDraft> {
  const { photoCipher, photoIv, photoMime, voiceCipher, voiceIv, voiceMime, ...metadata } = stored;
  const draft = metadata as OfflineDraft;
  if (photoCipher && photoIv) draft.photoBlob = await decryptBlob(database, photoCipher, photoIv, photoMime ?? 'image/jpeg');
  if (voiceCipher && voiceIv) draft.voiceBlob = await decryptBlob(database, voiceCipher, voiceIv, voiceMime ?? 'audio/webm');
  return draft;
}

async function saveDraft(draft: OfflineDraft) {
  const database = await openDatabase();
  const stored = await toStored(database, { ...draft, updatedAt: new Date().toISOString() });
  const transaction = database.transaction(DRAFT_STORE, 'readwrite');
  transaction.objectStore(DRAFT_STORE).put(stored);
  await transactionDone(transaction);
  database.close();
  return draft;
}

async function readDrafts() {
  const database = await openDatabase();
  const transaction = database.transaction(DRAFT_STORE, 'readonly');
  const stored = await requestResult(transaction.objectStore(DRAFT_STORE).getAll()) as StoredDraft[];
  const drafts = await Promise.all(stored.map((item) => fromStored(database, item)));
  database.close();
  const now = Date.now();
  const recovered = drafts.map((draft) => draft.status === 'uploading' && now - new Date(draft.updatedAt).getTime() > STALE_UPLOAD_MS
    ? { ...draft, status: 'queued' as const, lastError: 'Synchronisation interrompue, reprise automatique.' }
    : draft);
  await Promise.all(recovered.filter((draft, index) => draft.status !== drafts[index].status).map(saveDraft));
  return recovered.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

async function requestBackgroundSync() {
  try {
    const registration = await navigator.serviceWorker?.ready;
    const sync = (registration as ServiceWorkerRegistration & { sync?: { register: (tag: string) => Promise<void> } }).sync;
    await sync?.register(SYNC_TAG);
  } catch { /* The online event remains the fallback when Background Sync is unavailable. */ }
}

export type OfflineDraftInput = {
  clientRequestId?: string;
  title: string;
  body: string;
  category: string;
  hasVoice: boolean;
  hasPhoto: boolean;
  photo?: Blob;
  voice?: Blob;
  photoName?: string;
  voiceName?: string;
  voiceTranscript?: string;
  photoAssetId?: number;
  voiceAssetId?: number;
};

export async function queueOfflineDraft(input: OfflineDraftInput) {
  const now = new Date().toISOString();
  const id = input.clientRequestId ?? `offline-${crypto.randomUUID()}`;
  const { clientRequestId: _inputClientRequestId, photo, voice, ...draftInput } = input;
  const draft: OfflineDraft = { ...draftInput, photoBlob: photo, voiceBlob: voice, id, clientRequestId: id, createdAt: now, updatedAt: now, retryCount: 0, status: 'queued' };
  await saveDraft(draft);
  await requestBackgroundSync();
  return draft;
}

export async function getOfflineDrafts() {
  try { return await readDrafts(); } catch { return []; }
}

export async function countPendingOfflineDrafts() {
  const drafts = await getOfflineDrafts();
  return drafts.filter((draft) => draft.status !== 'synced').length;
}

async function processDraft(draft: OfflineDraft) {
  let current: OfflineDraft = { ...draft, status: 'uploading', lastError: undefined, retryCount: draft.retryCount + 1 };
  await saveDraft(current);
  try {
    if (current.photoBlob && !current.photoAssetId) {
      const uploaded = await uploadMedia(current.photoBlob, 'photo', current.photoName ?? 'photo-terrain.jpg', `${current.clientRequestId}:photo`, true);
      current = { ...current, photoAssetId: uploaded.data.id };
      await saveDraft(current);
    }
    if (current.voiceBlob && !current.voiceAssetId) {
      const uploaded = await uploadMedia(current.voiceBlob, 'voice', current.voiceName ?? 'note-vocale.webm', `${current.clientRequestId}:voice`, true);
      current = { ...current, voiceAssetId: uploaded.data.id };
      await saveDraft(current);
    }
    const attachmentIds = [current.photoAssetId, current.voiceAssetId].filter((value): value is number => Number.isInteger(value));
    await publishQuestion({ title: current.title, body: current.body, category: current.category, hasVoice: current.hasVoice, hasPhoto: current.hasPhoto, photoName: current.photoName, attachmentIds, clientRequestId: current.clientRequestId, voiceTranscript: current.voiceTranscript });
    await saveDraft({ ...current, status: 'synced', syncedAt: new Date().toISOString(), photoBlob: undefined, voiceBlob: undefined });
  } catch (error) {
    await saveDraft({ ...current, status: 'failed', lastError: error instanceof Error ? error.message : 'Échec de synchronisation.' });
  }
}

export function syncOfflineDrafts() {
  if (activeSync) return activeSync;
  activeSync = (async () => {
    if (!isApiConfigured || !navigator.onLine) return getOfflineDrafts();
    const drafts = await getOfflineDrafts();
    for (const draft of drafts.filter((item) => item.status === 'queued' || item.status === 'failed')) await processDraft(draft);
    return getOfflineDrafts();
  })().finally(() => { activeSync = null; });
  return activeSync;
}

export async function removeOfflineDraft(id: string) {
  const database = await openDatabase();
  const transaction = database.transaction(DRAFT_STORE, 'readwrite');
  transaction.objectStore(DRAFT_STORE).delete(id);
  await transactionDone(transaction);
  database.close();
}
