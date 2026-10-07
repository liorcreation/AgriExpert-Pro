import { currentUser, invalid, json, options } from '../../_shared/auth.js';

const MAX_PHOTO = 8 * 1024 * 1024;
const MAX_VOICE = 12 * 1024 * 1024;

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return options(request, env);
  if (request.method !== 'POST') return json(request, env, invalid('Méthode non autorisée.'), 405);
  if (!env.SUPABASE_URL || !env.SUPABASE_SECRET_KEY) return json(request, env, invalid('Le stockage média Supabase n’est pas encore configuré.'), 503);
  const user = await currentUser(env.DB, request);
  if (!user) return json(request, env, invalid('Connectez-vous pour envoyer un média.'), 401);
  const form = await request.formData();
  const file = form.get('file');
  const kind = form.get('kind') === 'voice' ? 'voice' : 'photo';
  if (!(file instanceof File)) return json(request, env, invalid('Fichier manquant.'), 422);
  const allowed = kind === 'photo' ? file.type.startsWith('image/') : file.type.startsWith('audio/');
  const maxSize = kind === 'photo' ? MAX_PHOTO : MAX_VOICE;
  if (!allowed || file.size < 1 || file.size > maxSize) return json(request, env, invalid(kind === 'photo' ? 'Photo invalide ou trop volumineuse (8 Mo maximum).' : 'Note vocale invalide ou trop volumineuse (12 Mo maximum).'), 422);
  const extension = file.name.includes('.') ? file.name.split('.').pop().slice(0, 8) : kind === 'photo' ? 'jpg' : 'webm';
  const clientRequestId = String(form.get('client_request_id') ?? '').trim().slice(0, 160) || null;
  if (clientRequestId) {
    const existing = await env.DB.prepare(`SELECT id, kind, file_name, mime_type, size_bytes, created_at FROM media_assets WHERE owner_user_id = ? AND client_request_id = ?`).bind(user.id, clientRequestId).first();
    if (existing) return json(request, env, { data: existing }, 200);
  }
  const key = `${user.id}/${kind}/${crypto.randomUUID()}.${extension}`;
  const uploadResponse = await fetch(`${env.SUPABASE_URL}/storage/v1/object/${env.SUPABASE_BUCKET ?? 'agriexpert-media'}/${key}`, {
    method: 'POST',
    headers: { apikey: env.SUPABASE_SECRET_KEY, Authorization: `Bearer ${env.SUPABASE_SECRET_KEY}`, 'Content-Type': file.type, 'x-upsert': 'false' },
    body: await file.arrayBuffer(),
  });
  if (!uploadResponse.ok) return json(request, env, invalid('Le fichier n’a pas pu être enregistré dans Supabase Storage.'), 502);
  const asset = await env.DB.prepare(`INSERT INTO media_assets (owner_user_id, kind, object_key, file_name, mime_type, size_bytes, client_request_id)
    VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id, kind, file_name, mime_type, size_bytes, created_at`).bind(user.id, kind, key, file.name.slice(0, 255), file.type, file.size, clientRequestId).first();
  return json(request, env, { data: asset }, 201);
}
