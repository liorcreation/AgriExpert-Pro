import { currentUser, invalid, json, options } from '../../../_shared/auth.js';

export async function onRequest(context) {
  const { request, env, params } = context;
  if (request.method === 'OPTIONS') return options(request, env);
  if (request.method !== 'GET') return json(request, env, invalid('Méthode non autorisée.'), 405);
  if (!env.SUPABASE_URL || !env.SUPABASE_SECRET_KEY) return json(request, env, invalid('Le stockage média Supabase n’est pas encore configuré.'), 503);
  const user = await currentUser(env.DB, request);
  const asset = await env.DB.prepare(`SELECT id, object_key, mime_type, file_name, question_id FROM media_assets
    WHERE id = ? AND (
      (question_id IS NOT NULL AND EXISTS (SELECT 1 FROM questions WHERE questions.id = media_assets.question_id))
      OR (? IS NOT NULL AND (owner_user_id = ? OR emergency_id IN (SELECT id FROM emergencies WHERE author_user_id = ?)))
    )`)
    .bind(Number(params.id), user?.id ?? null, user?.id ?? null, user?.id ?? null).first();
  if (!asset) return json(request, env, invalid('Média introuvable.'), 404);
  const object = await fetch(`${env.SUPABASE_URL}/storage/v1/object/${env.SUPABASE_BUCKET ?? 'agriexpert-media'}/${asset.object_key}`, { headers: { apikey: env.SUPABASE_SECRET_KEY, Authorization: `Bearer ${env.SUPABASE_SECRET_KEY}` } });
  if (!object.ok) return json(request, env, invalid('Fichier indisponible.'), object.status === 404 ? 404 : 502);
  const headers = new Headers(object.headers);
  headers.set('content-disposition', `inline; filename="${String(asset.file_name ?? 'media').replace(/["\\]/g, '')}"`);
  headers.set('Cache-Control', asset.question_id ? 'public, max-age=300' : 'private, no-store');
  return new Response(object.body, { headers });
}
