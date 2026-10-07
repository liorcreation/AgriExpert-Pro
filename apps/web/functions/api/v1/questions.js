import { currentUser, invalid, json, options } from '../../_shared/auth.js';

const categories = new Set(['agriculture', 'livestock', 'aquaculture', 'apiculture']);

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return options(request, env);
  if (request.method === 'GET') {
    const url = new URL(request.url);
    const category = url.searchParams.get('category');
    const search = (url.searchParams.get('search') ?? '').trim().slice(0, 100);
    const clauses = [];
    const values = [];
    if (category && categories.has(category)) { clauses.push('q.category = ?'); values.push(category); }
    if (search) { clauses.push('(q.title LIKE ? OR q.body LIKE ?)'); values.push(`%${search}%`, `%${search}%`); }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const page = Math.max(1, Math.min(10000, Number(url.searchParams.get('page') ?? 1)));
    const perPage = Math.max(1, Math.min(50, Number(url.searchParams.get('per_page') ?? 20)));
    const [rows, count] = await Promise.all([
      env.DB.prepare(`SELECT q.id, q.category, q.title, q.body, q.language, q.has_voice, q.has_photo, q.photo_name, q.status, q.created_at, u.name AS author_name,
        (SELECT m.id FROM media_assets m WHERE m.question_id = q.id AND m.kind = 'photo' ORDER BY m.id ASC LIMIT 1) AS photo_asset_id,
        (SELECT COUNT(*) FROM question_answers a WHERE a.question_id = q.id) AS answer_count,
        (SELECT COUNT(*) FROM question_reactions r WHERE r.question_id = q.id AND r.reaction = 'useful') AS useful_count,
        (SELECT d.id FROM diagnoses d WHERE d.question_id = q.id ORDER BY d.id DESC LIMIT 1) AS diagnosis_id
        FROM questions q JOIN users u ON u.id = q.author_user_id ${where} ORDER BY q.id DESC LIMIT ? OFFSET ?`)
        .bind(...values, perPage, (page - 1) * perPage).all(),
      env.DB.prepare(`SELECT COUNT(*) AS total FROM questions q ${where}`).bind(...values).first(),
    ]);
    const questionIds = rows.results.map((question) => question.id);
    const answers = questionIds.length
      ? await env.DB.prepare(`SELECT a.id, a.question_id, a.body, a.language, a.certified, a.created_at, u.name AS expert_name, u.profile AS expert_profile
          FROM question_answers a JOIN users u ON u.id = a.author_user_id
          WHERE a.question_id IN (${questionIds.map(() => '?').join(',')}) ORDER BY a.created_at ASC`).bind(...questionIds).all()
      : { results: [] };
    const answersByQuestion = new Map();
    for (const answer of answers.results) {
      if (!answersByQuestion.has(answer.question_id)) answersByQuestion.set(answer.question_id, answer);
    }
    const data = rows.results.map((question) => ({ ...question, answer: answersByQuestion.get(question.id) ?? null }));
    return json(request, env, { data, total: count.total, page, per_page: perPage });
  }
  if (request.method !== 'POST') return json(request, env, invalid('Méthode non autorisée.'), 405);
  const user = await currentUser(env.DB, request);
  if (!user) return json(request, env, invalid('Connectez-vous pour publier une question.'), 401);
  let input = {};
  try { input = await request.json(); } catch { return json(request, env, invalid('Corps JSON invalide.'), 400); }
  const category = String(input.category ?? '');
  const title = String(input.title ?? '').trim();
  const body = String(input.body ?? '').trim();
  const clientRequestId = String(input.clientRequestId ?? '').trim().slice(0, 160) || null;
  const attachmentIds = Array.isArray(input.attachmentIds) ? input.attachmentIds.map(Number).filter(Number.isInteger).slice(0, 4) : [];
  const language = input.language === 'mo' ? 'mo' : 'fr';
  if (!categories.has(category)) return json(request, env, invalid('Secteur invalide.'), 422);
  if (title.length < 4 || title.length > 200 || body.length < 5 || body.length > 10000) return json(request, env, invalid('Le titre doit contenir 4 à 200 caractères et la description 5 à 10 000 caractères.'), 422);
  if (clientRequestId) {
    const existing = await env.DB.prepare(`SELECT q.id, q.category, q.title, q.body, q.language, q.has_voice, q.has_photo, q.photo_name, q.status, q.created_at, u.name AS author_name
      FROM questions q JOIN users u ON u.id = q.author_user_id WHERE q.author_user_id = ? AND q.client_request_id = ?`).bind(user.id, clientRequestId).first();
    if (existing) {
      if (attachmentIds.length) await env.DB.prepare(`UPDATE media_assets SET question_id = ? WHERE owner_user_id = ? AND id IN (${attachmentIds.map(() => '?').join(',')})`).bind(existing.id, user.id, ...attachmentIds).run();
      const existingDiagnosisId = Number(input.diagnosisId);
      if (Number.isInteger(existingDiagnosisId) && existingDiagnosisId > 0) await env.DB.prepare('UPDATE diagnoses SET question_id = ? WHERE id = ? AND author_user_id = ?').bind(existing.id, existingDiagnosisId, user.id).run();
      return json(request, env, { data: existing }, 200);
    }
  }
  const result = await env.DB.prepare(`INSERT INTO questions (author_user_id, category, title, body, language, has_voice, has_photo, photo_name, client_request_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id, category, title, body, language, has_voice, has_photo, photo_name, status, created_at`)
    .bind(user.id, category, title, body, language, input.hasVoice ? 1 : 0, input.hasPhoto ? 1 : 0, input.photoName ? String(input.photoName).slice(0, 255) : null, clientRequestId).first();
  if (attachmentIds.length) {
    await env.DB.prepare(`UPDATE media_assets SET question_id = ? WHERE owner_user_id = ? AND id IN (${attachmentIds.map(() => '?').join(',')})`)
      .bind(result.id, user.id, ...attachmentIds).run();
  }
  const diagnosisId = Number(input.diagnosisId);
  if (Number.isInteger(diagnosisId) && diagnosisId > 0) {
    await env.DB.prepare('UPDATE diagnoses SET question_id = ? WHERE id = ? AND author_user_id = ?').bind(result.id, diagnosisId, user.id).run();
  }
  return json(request, env, { data: { ...result, author_name: user.name } }, 201);
}
