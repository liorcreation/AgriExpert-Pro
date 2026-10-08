import { currentUser, invalid, json, options, rateLimitResponse } from '../../../_shared/auth.js';

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return options(request, env);
  const user = await currentUser(env.DB, request);
  if (!user) return json(request, env, invalid('Connectez-vous pour accéder à vos données.'), 401);
  const limited = await rateLimitResponse(env.DB, request, env, 'account-privacy', request.method === 'DELETE' ? 3 : 5, 3600);
  if (limited) return limited;

  if (request.method === 'DELETE') {
    const created = await env.DB.prepare(`INSERT INTO privacy_requests (user_id, request_type) VALUES (?, 'account_erasure') RETURNING id, status, created_at`).bind(user.id).first();
    return json(request, env, {
      message: 'Votre demande de suppression a été enregistrée pour examen. Le compte et les données ne sont pas supprimés automatiquement ; les obligations de conservation et les justificatifs financiers doivent être vérifiés avant traitement.',
      data: { requestId: created.id, status: created.status, createdAt: created.created_at },
    }, 202);
  }
  if (request.method !== 'GET') return json(request, env, invalid('Méthode non autorisée.'), 405);

  const [questions, answers, emergencies, media, transcriptions, diagnoses, preferences, consents, payments, receipts, requests] = await Promise.all([
    env.DB.prepare('SELECT id, category, title, body, language, has_voice, has_photo, photo_name, status, created_at FROM questions WHERE author_user_id = ? ORDER BY created_at DESC').bind(user.id).all(),
    env.DB.prepare('SELECT id, question_id, body, language, certified, created_at FROM question_answers WHERE author_user_id = ? ORDER BY created_at DESC').bind(user.id).all(),
    env.DB.prepare('SELECT id, reference, kind, title, description, priority, latitude, longitude, status, created_at FROM emergencies WHERE author_user_id = ? ORDER BY created_at DESC').bind(user.id).all(),
    env.DB.prepare('SELECT id, question_id, emergency_id, kind, file_name, mime_type, size_bytes, created_at FROM media_assets WHERE owner_user_id = ? ORDER BY created_at DESC').bind(user.id).all(),
    env.DB.prepare('SELECT id, media_asset_id, transcript, language, provider, model, status, consent_at, created_at FROM voice_transcriptions WHERE owner_user_id = ? ORDER BY created_at DESC').bind(user.id).all(),
    env.DB.prepare('SELECT id, media_asset_id, question_id, category, context, status, result_json, provider, model, created_at FROM diagnoses WHERE author_user_id = ? ORDER BY created_at DESC').bind(user.id).all(),
    env.DB.prepare('SELECT language, voice_enabled, dark_mode, updated_at FROM user_preferences WHERE user_id = ?').bind(user.id).first(),
    env.DB.prepare('SELECT purpose, policy_version, granted, context_json, created_at FROM user_consents WHERE user_id = ? ORDER BY created_at DESC').bind(user.id).all(),
    env.DB.prepare('SELECT id, plan_code, status, provider, amount_xof, provider_reference, paid_at, created_at FROM billing_payments WHERE user_id = ? ORDER BY created_at DESC').bind(user.id).all(),
    env.DB.prepare(`SELECT r.receipt_number, r.snapshot_json, r.issued_at FROM billing_receipts r JOIN billing_payments p ON p.id = r.payment_id WHERE p.user_id = ? ORDER BY r.issued_at DESC`).bind(user.id).all(),
    env.DB.prepare('SELECT id, request_type, status, created_at, completed_at FROM privacy_requests WHERE user_id = ? ORDER BY created_at DESC').bind(user.id).all(),
  ]);
  const userData = { id: user.id, name: user.name, email: user.email, phone: user.phone ?? null, role: user.role, profile: user.profile ?? null, plan: user.plan };
  const payload = { exportedAt: new Date().toISOString(), format: 'AgriExpert personal data export v1', account: userData, preferences, questions: questions.results, answers: answers.results, emergencies: emergencies.results, mediaMetadata: media.results, voiceTranscriptions: transcriptions.results, photoDiagnoses: diagnoses.results, consents: consents.results.map((item) => ({ ...item, context: JSON.parse(item.context_json || '{}') })), payments: payments.results, receipts: receipts.results.map((item) => ({ ...item, snapshot: JSON.parse(item.snapshot_json || '{}') })), privacyRequests: requests.results };
  await env.DB.prepare(`INSERT INTO privacy_requests (user_id, request_type, status) VALUES (?, 'access_export', 'completed')`).bind(user.id).run();
  return json(request, env, { data: payload }, 200, { 'Content-Disposition': 'attachment; filename="agriexpert-personal-data.json"' });
}
