import { currentUser, invalid, json, options, rateLimitResponse } from '../../_shared/auth.js';

const MAX_PHOTO = 8 * 1024 * 1024;
const MAX_VOICE = 12 * 1024 * 1024;

function detectMime(bytes) {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.length >= 8 && bytes.slice(0, 8).join(',') === '137,80,78,71,13,10,26,10') return 'image/png';
  if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP') return 'image/webp';
  if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(4, 8)) === 'ftyp') {
    const brand = String.fromCharCode(...bytes.slice(8, 12));
    if (['heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1'].includes(brand)) return 'image/heic';
    if (['avif', 'avis'].includes(brand)) return 'image/avif';
    return 'audio/mp4';
  }
  if (bytes.length >= 4 && bytes.slice(0, 4).join(',') === '26,69,223,163') return 'audio/webm';
  if (bytes.length >= 4 && String.fromCharCode(...bytes.slice(0, 4)) === 'OggS') return 'audio/ogg';
  if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WAVE') return 'audio/wav';
  if (bytes.length >= 3 && String.fromCharCode(...bytes.slice(0, 3)) === 'ID3') return 'audio/mpeg';
  if (bytes.length >= 2 && bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0) return 'audio/mpeg';
  if (bytes.length >= 2 && bytes[0] === 0xff && (bytes[1] & 0xf6) === 0xf0) return 'audio/aac';
  return null;
}

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return options(request, env);
  if (request.method !== 'POST') return json(request, env, invalid('Méthode non autorisée.'), 405);
  if (!env.SUPABASE_URL || !env.SUPABASE_SECRET_KEY) return json(request, env, invalid('Le stockage média Supabase n’est pas encore configuré.'), 503);
  const user = await currentUser(env.DB, request);
  if (!user) return json(request, env, invalid('Connectez-vous pour envoyer un média.'), 401);
  const limited = await rateLimitResponse(env.DB, request, env, `media:${user.id}`, 30, 600);
  if (limited) return limited;
  const declaredLength = Number(request.headers.get('Content-Length') ?? 0);
  if (declaredLength > MAX_VOICE + 64 * 1024) return json(request, env, invalid('Fichier trop volumineux.'), 413);
  const form = await request.formData();
  const file = form.get('file');
  const kind = form.get('kind') === 'voice' ? 'voice' : 'photo';
  if (form.get('consent') !== 'true') return json(request, env, invalid('Un accord explicite est requis avant l’envoi d’une photo ou d’un audio.'), 422);
  if (!(file instanceof File)) return json(request, env, invalid('Fichier manquant.'), 422);
  const allowedTypes = kind === 'photo'
    ? new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/avif'])
    : new Set(['audio/webm', 'audio/ogg', 'audio/wav', 'audio/x-wav', 'audio/mp4', 'audio/x-m4a', 'audio/mpeg', 'audio/aac']);
  const maxSize = kind === 'photo' ? MAX_PHOTO : MAX_VOICE;
  if (!allowedTypes.has(file.type) || file.size < 1 || file.size > maxSize) return json(request, env, invalid(kind === 'photo' ? 'Format photo non pris en charge ou fichier trop volumineux (8 Mo maximum).' : 'Format audio non pris en charge ou fichier trop volumineux (12 Mo maximum).'), 422);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const detectedType = detectMime(bytes);
  const matchesType = detectedType && (file.type === detectedType || (file.type === 'image/heif' && detectedType === 'image/heic') || (file.type === 'audio/x-wav' && detectedType === 'audio/wav') || (file.type === 'audio/x-m4a' && detectedType === 'audio/mp4'));
  if (!matchesType || (kind === 'photo' && !detectedType.startsWith('image/')) || (kind === 'voice' && !detectedType.startsWith('audio/'))) return json(request, env, invalid('Le contenu du fichier ne correspond pas à un format image ou audio autorisé.'), 422);
  const extensions = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic', 'image/avif': 'avif', 'audio/webm': 'webm', 'audio/ogg': 'ogg', 'audio/wav': 'wav', 'audio/mp4': 'm4a', 'audio/mpeg': 'mp3', 'audio/aac': 'aac' };
  const extension = extensions[detectedType];
  const clientRequestId = String(form.get('client_request_id') ?? '').trim().slice(0, 160) || null;
  await env.DB.prepare(`INSERT INTO user_consents (user_id, purpose, policy_version, granted, context_json) VALUES (?, 'media_storage_and_expert_sharing', '2026-10-08-draft', 1, ?)`)
    .bind(user.id, JSON.stringify({ kind, mimeType: detectedType, sizeBytes: file.size })).run();
  if (clientRequestId) {
    const existing = await env.DB.prepare(`SELECT id, kind, file_name, mime_type, size_bytes, created_at FROM media_assets WHERE owner_user_id = ? AND client_request_id = ?`).bind(user.id, clientRequestId).first();
    if (existing) return json(request, env, { data: existing }, 200);
  }
  const key = `${user.id}/${kind}/${crypto.randomUUID()}.${extension}`;
  const uploadResponse = await fetch(`${env.SUPABASE_URL}/storage/v1/object/${env.SUPABASE_BUCKET ?? 'agriexpert-media'}/${key}`, {
    method: 'POST',
    headers: { apikey: env.SUPABASE_SECRET_KEY, Authorization: `Bearer ${env.SUPABASE_SECRET_KEY}`, 'Content-Type': detectedType, 'x-upsert': 'false' },
    body: bytes,
  });
  if (!uploadResponse.ok) return json(request, env, invalid('Le fichier n’a pas pu être enregistré dans Supabase Storage.'), 502);
  const asset = await env.DB.prepare(`INSERT INTO media_assets (owner_user_id, kind, object_key, file_name, mime_type, size_bytes, client_request_id)
    VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id, kind, file_name, mime_type, size_bytes, created_at`).bind(user.id, kind, key, file.name.replace(/[\r\n\0]/g, '').slice(0, 255), detectedType, file.size, clientRequestId).first();
  return json(request, env, { data: asset }, 201);
}
