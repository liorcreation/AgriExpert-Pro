import { currentUser, invalid, json, options, rateLimitResponse } from '../../../_shared/auth.js';

export async function onRequest(context) {
  const { request, env, params } = context;
  if (request.method === 'OPTIONS') return options(request, env);
  if (!env.SUPABASE_URL || !env.SUPABASE_SECRET_KEY) return json(request, env, invalid('Le stockage média Supabase n’est pas encore configuré.'), 503);
  const user = await currentUser(env.DB, request);
  if (request.method === 'DELETE') {
    if (!user) return json(request, env, invalid('Connectez-vous pour retirer ce média.'), 401);
    const limited = await rateLimitResponse(env.DB, request, env, `media-delete:${user.id}`, 20, 600);
    if (limited) return limited;
    const assetToDelete = await env.DB.prepare(`SELECT id, object_key FROM media_assets WHERE id = ? AND owner_user_id = ? AND question_id IS NULL AND emergency_id IS NULL`).bind(Number(params.id), user.id).first();
    if (!assetToDelete) return json(request, env, invalid('Média introuvable ou déjà rattaché à un dossier.'), 404);
    const removed = await fetch(`${env.SUPABASE_URL}/storage/v1/object/${env.SUPABASE_BUCKET ?? 'agriexpert-media'}`, { method: 'POST', headers: { apikey: env.SUPABASE_SECRET_KEY, Authorization: `Bearer ${env.SUPABASE_SECRET_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ prefixes: [assetToDelete.object_key] }) });
    if (!removed.ok) return json(request, env, invalid('Le fichier n’a pas pu être supprimé du stockage. Réessayez.'), 502);
    await env.DB.prepare('DELETE FROM media_assets WHERE id = ? AND owner_user_id = ?').bind(assetToDelete.id, user.id).run();
    await env.DB.prepare(`INSERT INTO user_consents (user_id, purpose, policy_version, granted, context_json) VALUES (?, 'media_storage_and_expert_sharing', '2026-10-08-draft', 0, ?)`)
      .bind(user.id, JSON.stringify({ mediaAssetId: assetToDelete.id, reason: 'user_removed_unattached_media' })).run();
    return json(request, env, { message: 'La pièce jointe non publiée a été retirée du stockage.' });
  }
  if (request.method !== 'GET') return json(request, env, invalid('Méthode non autorisée.'), 405);
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
