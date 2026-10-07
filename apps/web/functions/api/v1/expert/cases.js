import { currentUser, invalid, json, options } from '../../../_shared/auth.js';

const statuses = new Set(['in_progress', 'waiting_producer', 'answered', 'closed']);

async function readCase(db, questionId) {
  const question = await db.prepare(`SELECT q.id, q.category, q.title, q.body, q.language, q.has_voice, q.has_photo, q.photo_name, q.status, q.created_at,
      producer.name AS producer_name, producer.profile AS producer_profile,
      ec.expert_user_id, ec.status AS case_status, ec.accepted_at, ec.completed_at, ec.updated_at
    FROM questions q JOIN users producer ON producer.id = q.author_user_id LEFT JOIN expert_cases ec ON ec.question_id = q.id WHERE q.id = ?`).bind(questionId).first();
  if (!question) return null;
  const [media, answers, messages, annotations, events] = await Promise.all([
    db.prepare(`SELECT id, kind, file_name, mime_type, size_bytes FROM media_assets WHERE question_id = ? ORDER BY created_at ASC`).bind(questionId).all(),
    db.prepare(`SELECT a.id, a.body, a.language, a.certified, a.voice_asset_id, a.created_at, u.name AS author_name, u.role AS author_role, u.profile AS author_profile
      FROM question_answers a JOIN users u ON u.id = a.author_user_id WHERE a.question_id = ? ORDER BY a.created_at ASC`).bind(questionId).all(),
    db.prepare(`SELECT m.id, m.kind, m.body, m.created_at, u.name AS author_name FROM expert_case_messages m JOIN users u ON u.id = m.author_user_id WHERE m.question_id = ? ORDER BY m.created_at ASC`).bind(questionId).all(),
    db.prepare(`SELECT a.id, a.media_asset_id, a.label, a.note, a.x, a.y, a.width, a.height, a.created_at, u.name AS expert_name FROM expert_annotations a JOIN users u ON u.id = a.expert_user_id WHERE a.question_id = ? ORDER BY a.created_at DESC`).bind(questionId).all(),
    db.prepare(`SELECT e.id, e.action, e.details_json, e.created_at, u.name AS actor_name FROM expert_case_events e LEFT JOIN users u ON u.id = e.actor_user_id WHERE e.question_id = ? ORDER BY e.created_at ASC`).bind(questionId).all(),
  ]);
  return { ...question, media: media.results, answers: answers.results, messages: messages.results, annotations: annotations.results, events: events.results };
}

async function canAccess(db, questionId, userId) {
  const row = await db.prepare(`SELECT q.status, ec.expert_user_id,
      EXISTS (SELECT 1 FROM question_answers own_answer WHERE own_answer.question_id = q.id AND own_answer.author_user_id = ?) AS answered_by_me
    FROM questions q LEFT JOIN expert_cases ec ON ec.question_id = q.id WHERE q.id = ?`).bind(userId, questionId).first();
  return row && (row.status === 'open' || Number(row.expert_user_id) === userId || Number(row.answered_by_me) === 1);
}

async function ensureCase(db, questionId, userId) {
  const existing = await db.prepare('SELECT question_id, expert_user_id, status FROM expert_cases WHERE question_id = ?').bind(questionId).first();
  if (existing?.expert_user_id && Number(existing.expert_user_id) !== userId && !['transferred', 'closed'].includes(existing.status)) return { conflict: true, case: existing };
  if (!existing) await db.prepare(`INSERT INTO expert_cases (question_id, expert_user_id, status, accepted_at) VALUES (?, ?, 'in_progress', CURRENT_TIMESTAMP)`).bind(questionId, userId).run();
  else await db.prepare(`UPDATE expert_cases SET expert_user_id = ?, status = 'in_progress', accepted_at = COALESCE(accepted_at, CURRENT_TIMESTAMP), updated_at = CURRENT_TIMESTAMP WHERE question_id = ?`).bind(userId, questionId).run();
  return { conflict: false };
}

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return options(request, env);
  const user = await currentUser(env.DB, request);
  if (!user) return json(request, env, invalid('Connectez-vous pour ouvrir un dossier expert.'), 401);
  if (user.role !== 'expert') return json(request, env, invalid('Les dossiers métier sont réservés aux experts.'), 403);
  const url = new URL(request.url);
  const questionId = Number(url.searchParams.get('questionId'));
  if (!Number.isInteger(questionId) || questionId < 1) return json(request, env, invalid('Dossier invalide.'), 422);
  const question = await env.DB.prepare('SELECT id FROM questions WHERE id = ?').bind(questionId).first();
  if (!question) return json(request, env, invalid('Dossier introuvable.'), 404);
  if (request.method === 'GET') {
    if (!(await canAccess(env.DB, questionId, user.id))) return json(request, env, invalid('Ce dossier n’est pas dans votre périmètre.'), 403);
    return json(request, env, { data: await readCase(env.DB, questionId) });
  }
  if (request.method !== 'POST') return json(request, env, invalid('Méthode non autorisée.'), 405);
  let input = {};
  try { input = await request.json(); } catch { return json(request, env, invalid('Corps JSON invalide.'), 400); }
  const action = String(input.action ?? '');
  const access = await canAccess(env.DB, questionId, user.id);
  if (!access && action !== 'accept') return json(request, env, invalid('Ce dossier n’est pas disponible pour vous.'), 403);

  if (action === 'accept') {
    const result = await ensureCase(env.DB, questionId, user.id);
    if (result.conflict) return json(request, env, invalid('Ce dossier est déjà pris en charge par un autre expert.'), 409);
    await env.DB.prepare(`INSERT INTO expert_case_events (question_id, actor_user_id, action, details_json) VALUES (?, ?, 'accepted', '{}')`).bind(questionId, user.id).run();
  } else if (action === 'reply') {
    const body = String(input.body ?? '').trim();
    const language = input.language === 'mo' ? 'mo' : 'fr';
    if (body.length < 5 || body.length > 10000) return json(request, env, invalid('La réponse doit contenir entre 5 et 10 000 caractères.'), 422);
    const ensured = await ensureCase(env.DB, questionId, user.id);
    if (ensured.conflict) return json(request, env, invalid('Ce dossier est déjà pris en charge par un autre expert.'), 409);
    const voiceAssetId = Number(input.voiceAssetId);
    let resolvedVoiceAssetId = null;
    if (Number.isInteger(voiceAssetId) && voiceAssetId > 0) {
      const voice = await env.DB.prepare(`SELECT id FROM media_assets WHERE id = ? AND owner_user_id = ? AND kind = 'voice' AND (question_id IS NULL OR question_id = ?)`).bind(voiceAssetId, user.id, questionId).first();
      if (!voice) return json(request, env, invalid('La note vocale est introuvable ou non autorisée.'), 422);
      await env.DB.prepare('UPDATE media_assets SET question_id = ? WHERE id = ?').bind(questionId, voiceAssetId).run();
      resolvedVoiceAssetId = voiceAssetId;
    }
    await env.DB.prepare(`INSERT INTO question_answers (question_id, author_user_id, body, language, certified, voice_asset_id) VALUES (?, ?, ?, ?, 1, ?)`).bind(questionId, user.id, body, language, resolvedVoiceAssetId).run();
    await env.DB.prepare(`UPDATE questions SET status = 'answered' WHERE id = ?`).bind(questionId).run();
    await env.DB.prepare(`UPDATE expert_cases SET status = 'answered', completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE question_id = ?`).bind(questionId).run();
    await env.DB.prepare(`INSERT INTO expert_case_events (question_id, actor_user_id, action, details_json) VALUES (?, ?, 'replied', ?)`).bind(questionId, user.id, JSON.stringify({ voice_asset_id: resolvedVoiceAssetId })).run();
    await env.DB.prepare(`INSERT INTO expert_earnings (expert_user_id, question_id, amount_xof, status) SELECT ?, ?, NULL, 'pending' WHERE NOT EXISTS (SELECT 1 FROM expert_earnings WHERE expert_user_id = ? AND question_id = ?)`).bind(user.id, questionId, user.id, questionId).run();
  } else if (action === 'request-info') {
    const body = String(input.body ?? '').trim();
    if (body.length < 5 || body.length > 4000) return json(request, env, invalid('La demande doit contenir entre 5 et 4 000 caractères.'), 422);
    const ensured = await ensureCase(env.DB, questionId, user.id);
    if (ensured.conflict) return json(request, env, invalid('Ce dossier est déjà pris en charge par un autre expert.'), 409);
    await env.DB.prepare(`INSERT INTO expert_case_messages (question_id, author_user_id, kind, body) VALUES (?, ?, 'request_info', ?)`).bind(questionId, user.id, body).run();
    await env.DB.prepare(`UPDATE expert_cases SET status = 'waiting_producer', updated_at = CURRENT_TIMESTAMP WHERE question_id = ?`).bind(questionId).run();
    await env.DB.prepare(`INSERT INTO expert_case_events (question_id, actor_user_id, action, details_json) VALUES (?, ?, 'requested_info', '{}')`).bind(questionId, user.id).run();
  } else if (action === 'annotate') {
    const mediaAssetId = Number(input.mediaAssetId);
    const label = String(input.label ?? '').trim().slice(0, 120);
    const note = String(input.note ?? '').trim().slice(0, 1000);
    const x = Number(input.x ?? 0), y = Number(input.y ?? 0), width = Number(input.width ?? 12), height = Number(input.height ?? 12);
    const media = await env.DB.prepare(`SELECT id FROM media_assets WHERE id = ? AND question_id = ? AND kind = 'photo'`).bind(mediaAssetId, questionId).first();
    if (!media || !label || ![x, y, width, height].every(Number.isFinite) || x < 0 || x > 100 || y < 0 || y > 100 || width <= 0 || width > 100 || height <= 0 || height > 100) return json(request, env, invalid('Annotation photo invalide.'), 422);
    const ensured = await ensureCase(env.DB, questionId, user.id);
    if (ensured.conflict) return json(request, env, invalid('Ce dossier est déjà pris en charge par un autre expert.'), 409);
    await env.DB.prepare(`INSERT INTO expert_annotations (question_id, media_asset_id, expert_user_id, label, note, x, y, width, height) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(questionId, mediaAssetId, user.id, label, note, x, y, width, height).run();
    await env.DB.prepare(`INSERT INTO expert_case_events (question_id, actor_user_id, action, details_json) VALUES (?, ?, 'annotated', ?)`).bind(questionId, user.id, JSON.stringify({ label })).run();
  } else if (action === 'status') {
    const status = String(input.status ?? '');
    if (!statuses.has(status)) return json(request, env, invalid('Statut de dossier invalide.'), 422);
    const ensured = await ensureCase(env.DB, questionId, user.id);
    if (ensured.conflict) return json(request, env, invalid('Ce dossier est déjà pris en charge par un autre expert.'), 409);
    await env.DB.prepare(`UPDATE expert_cases SET status = ?, completed_at = CASE WHEN ? = 'closed' THEN CURRENT_TIMESTAMP ELSE completed_at END, updated_at = CURRENT_TIMESTAMP WHERE question_id = ?`).bind(status, status, questionId).run();
    if (status === 'closed') await env.DB.prepare(`UPDATE questions SET status = 'closed' WHERE id = ?`).bind(questionId).run();
    await env.DB.prepare(`INSERT INTO expert_case_events (question_id, actor_user_id, action, details_json) VALUES (?, ?, ?, ?)`).bind(questionId, user.id, status === 'closed' ? 'closed' : 'status_changed', JSON.stringify({ status })).run();
  } else if (action === 'transfer') {
    const targetId = Number(input.targetExpertId);
    const target = await env.DB.prepare(`SELECT id FROM users WHERE id = ? AND role = 'expert'`).bind(targetId).first();
    if (!target || targetId === user.id) return json(request, env, invalid('Expert destinataire invalide.'), 422);
    const ensured = await ensureCase(env.DB, questionId, user.id);
    if (ensured.conflict) return json(request, env, invalid('Ce dossier est déjà pris en charge par un autre expert.'), 409);
    await env.DB.prepare(`UPDATE expert_cases SET status = 'transferred', updated_at = CURRENT_TIMESTAMP WHERE question_id = ?`).bind(questionId).run();
    await env.DB.prepare(`INSERT INTO expert_cases (question_id, expert_user_id, status, updated_at) VALUES (?, ?, 'queued', CURRENT_TIMESTAMP) ON CONFLICT(question_id) DO UPDATE SET expert_user_id = excluded.expert_user_id, status = 'queued', updated_at = CURRENT_TIMESTAMP`).bind(questionId, targetId).run();
    await env.DB.prepare(`INSERT INTO expert_case_events (question_id, actor_user_id, action, details_json) VALUES (?, ?, 'transferred', ?)`).bind(questionId, user.id, JSON.stringify({ target_expert_id: targetId })).run();
  } else {
    return json(request, env, invalid('Action expert inconnue.'), 422);
  }
  return json(request, env, { data: await readCase(env.DB, questionId) });
}
