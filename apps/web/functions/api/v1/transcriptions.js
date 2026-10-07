import { currentUser, invalid, json, options } from '../../_shared/auth.js';

const MAX_TRANSCRIBE_BYTES = 12 * 1024 * 1024;

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return options(request, env);
  const user = await currentUser(env.DB, request);
  if (!user) return json(request, env, invalid('Connectez-vous pour accéder à la transcription.'), 401);

  if (request.method === 'GET') {
    return json(request, env, { data: { enabled: env.OPENAI_TRANSCRIPTION_ENABLED === 'true' && Boolean(env.OPENAI_API_KEY), supportedLanguages: ['fr'], mooreAvailable: false } });
  }
  if (request.method !== 'POST') return json(request, env, invalid('Méthode non autorisée.'), 405);

  let input = {};
  try { input = await request.json(); } catch { return json(request, env, invalid('Corps JSON invalide.'), 400); }
  const mediaId = Number(input.mediaId);
  const language = input.language === 'mo' ? 'mo' : 'fr';
  if (input.consent !== true) return json(request, env, invalid('Votre accord est nécessaire avant tout envoi audio au service de transcription.'), 422);
  if (!Number.isInteger(mediaId) || mediaId < 1) return json(request, env, invalid('Note vocale invalide.'), 422);
  if (language === 'mo') return json(request, env, invalid('La transcription automatique du Mooré n’est pas validée. Votre audio reste disponible pour un expert humain.'), 422);
  if (env.OPENAI_TRANSCRIPTION_ENABLED !== 'true') return json(request, env, invalid('La transcription serveur est actuellement désactivée. La note vocale peut tout de même être publiée et écoutée par un expert.'), 503);
  if (!env.OPENAI_API_KEY || !env.SUPABASE_URL || !env.SUPABASE_SECRET_KEY) return json(request, env, invalid('Le service de transcription n’est pas entièrement configuré.'), 503);

  const asset = await env.DB.prepare(`SELECT id, owner_user_id, object_key, file_name, mime_type, size_bytes FROM media_assets WHERE id = ? AND owner_user_id = ? AND kind = 'voice'`).bind(mediaId, user.id).first();
  if (!asset) return json(request, env, invalid('Cette note vocale est introuvable ou ne vous appartient pas.'), 404);
  if (asset.size_bytes > MAX_TRANSCRIBE_BYTES) return json(request, env, invalid('La note vocale dépasse la taille maximale de transcription (12 Mo).'), 422);

  const model = env.OPENAI_TRANSCRIPTION_MODEL ?? 'whisper-1';
  const existing = await env.DB.prepare('SELECT id, transcript, language, provider, model, status, consent_at, created_at FROM voice_transcriptions WHERE media_asset_id = ? AND owner_user_id = ?').bind(mediaId, user.id).first();
  if (existing?.status === 'completed' && existing.transcript) return json(request, env, { data: existing, reused: true });
  const dailyUsage = await env.DB.prepare(`SELECT COUNT(*) AS total FROM voice_transcriptions WHERE owner_user_id = ? AND created_at >= datetime('now', '-1 day') AND status IN ('pending', 'completed')`).bind(user.id).first();
  if (!existing && Number(dailyUsage?.total ?? 0) >= 5) return json(request, env, invalid('La limite de cinq transcriptions par jour est atteinte. Réessayez demain.'), 429);
  const consentAt = new Date().toISOString();
  const requestRecord = existing
    ? await env.DB.prepare(`UPDATE voice_transcriptions SET status = 'pending', transcript = NULL, language = 'fr', provider = 'openai', model = ?, consent_at = ? WHERE id = ? RETURNING id`).bind(model, consentAt, existing.id).first()
    : await env.DB.prepare(`INSERT INTO voice_transcriptions (media_asset_id, owner_user_id, language, provider, model, status, consent_at)
        VALUES (?, ?, 'fr', 'openai', ?, 'pending', ?) RETURNING id`).bind(mediaId, user.id, model, consentAt).first();

  const markFailed = async () => env.DB.prepare("UPDATE voice_transcriptions SET status = 'failed' WHERE id = ?").bind(requestRecord.id).run();

  let storageResponse;
  try {
    storageResponse = await fetch(`${env.SUPABASE_URL}/storage/v1/object/authenticated/${env.SUPABASE_BUCKET ?? 'agriexpert-media'}/${asset.object_key}`, {
      headers: { apikey: env.SUPABASE_SECRET_KEY, Authorization: `Bearer ${env.SUPABASE_SECRET_KEY}` },
    });
  } catch {
    await markFailed();
    return json(request, env, invalid('Le stockage vocal est momentanément inaccessible.'), 502);
  }
  if (!storageResponse.ok) { await markFailed(); return json(request, env, invalid('La note vocale n’a pas pu être récupérée pour transcription.'), 502); }
  const audio = await storageResponse.arrayBuffer();
  if (!audio.byteLength || audio.byteLength > MAX_TRANSCRIBE_BYTES) { await markFailed(); return json(request, env, invalid('Fichier audio vide ou trop volumineux.'), 422); }

  const extension = (asset.file_name?.split('.').pop() || 'webm').replace(/[^a-z0-9]/gi, '').slice(0, 8) || 'webm';
  const form = new FormData();
  form.set('file', new File([audio], `agriexpert-voice.${extension}`, { type: asset.mime_type || 'audio/webm' }));
  form.set('model', env.OPENAI_TRANSCRIPTION_MODEL ?? 'whisper-1');
  form.set('response_format', 'json');
  form.set('language', 'fr');

  let providerResponse;
  try {
    providerResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}` },
      body: form,
    });
  } catch {
    await markFailed();
    return json(request, env, invalid('Le service de transcription est momentanément inaccessible. Votre note vocale reste enregistrée.'), 502);
  }
  if (!providerResponse.ok) {
    await markFailed();
    const providerBody = await providerResponse.json().catch(() => ({}));
    const message = providerResponse.status === 429
      ? 'La transcription est temporairement indisponible (quota ou facturation du fournisseur). Votre note vocale reste enregistrée.'
      : providerResponse.status === 401
        ? 'La configuration du service de transcription doit être vérifiée.'
        : 'La transcription n’a pas abouti. Votre note vocale reste enregistrée.';
    return json(request, env, invalid(message, { provider_status: providerResponse.status, provider_message: String(providerBody?.error?.message ?? '').slice(0, 180) }), providerResponse.status === 429 ? 429 : 502);
  }

  const providerResult = await providerResponse.json().catch(() => ({}));
  const transcript = String(providerResult.text ?? '').trim().slice(0, 10000);
  if (!transcript) { await markFailed(); return json(request, env, invalid('Aucun texte exploitable n’a été reconnu. L’audio reste disponible pour un expert.'), 422); }
  const saved = await env.DB.prepare(`UPDATE voice_transcriptions SET transcript = ?, status = 'completed' WHERE id = ? RETURNING id, transcript, language, provider, model, status, consent_at, created_at`)
    .bind(transcript, requestRecord.id).first();
  return json(request, env, { data: saved, warning: 'Transcription automatique à relire avant utilisation technique.' }, 201);
}
