import { currentUser, invalid, json, options } from '../../../_shared/auth.js';

export async function onRequest(context) {
  const { request, env, params } = context;
  if (request.method === 'OPTIONS') return options(request, env);
  if (request.method !== 'GET') return json(request, env, invalid('Méthode non autorisée.'), 405);
  if (!env.MEDIA_BUCKET) return json(request, env, invalid('Le stockage média Cloudflare R2 n’est pas encore activé.'), 503);
  const user = await currentUser(env.DB, request);
  if (!user) return json(request, env, invalid('Connectez-vous pour consulter ce média.'), 401);
  const asset = await env.DB.prepare(`SELECT id, object_key, mime_type, file_name FROM media_assets
    WHERE id = ? AND (owner_user_id = ? OR question_id IN (SELECT id FROM questions WHERE author_user_id = ?) OR emergency_id IN (SELECT id FROM emergencies WHERE author_user_id = ?))`)
    .bind(Number(params.id), user.id, user.id, user.id).first();
  if (!asset) return json(request, env, invalid('Média introuvable.'), 404);
  const object = await env.MEDIA_BUCKET.get(asset.object_key);
  if (!object) return json(request, env, invalid('Fichier indisponible.'), 404);
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('content-disposition', `inline; filename="${String(asset.file_name ?? 'media').replace(/["\\]/g, '')}"`);
  return new Response(object.body, { headers });
}
