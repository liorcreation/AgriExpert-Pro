import { currentUser, invalid, json, options } from '../../_shared/auth.js';

const MAX_PHOTO = 8 * 1024 * 1024;
const MAX_VOICE = 12 * 1024 * 1024;

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return options(request, env);
  if (request.method !== 'POST') return json(request, env, invalid('Méthode non autorisée.'), 405);
  if (!env.MEDIA_BUCKET) return json(request, env, invalid('Le stockage média Cloudflare R2 n’est pas encore activé.'), 503);
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
  const key = `${user.id}/${kind}/${crypto.randomUUID()}.${extension}`;
  await env.MEDIA_BUCKET.put(key, file.stream(), { httpMetadata: { contentType: file.type } });
  const asset = await env.DB.prepare(`INSERT INTO media_assets (owner_user_id, kind, object_key, file_name, mime_type, size_bytes)
    VALUES (?, ?, ?, ?, ?, ?) RETURNING id, kind, file_name, mime_type, size_bytes, created_at`).bind(user.id, kind, key, file.name.slice(0, 255), file.type, file.size).first();
  return json(request, env, { data: asset }, 201);
}
