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
      env.DB.prepare(`SELECT q.id, q.category, q.title, q.body, q.language, q.has_voice, q.has_photo, q.photo_name, q.status, q.created_at, u.name AS author_name
        FROM questions q JOIN users u ON u.id = q.author_user_id ${where} ORDER BY q.id DESC LIMIT ? OFFSET ?`)
        .bind(...values, perPage, (page - 1) * perPage).all(),
      env.DB.prepare(`SELECT COUNT(*) AS total FROM questions q ${where}`).bind(...values).first(),
    ]);
    return json(request, env, { data: rows.results, total: count.total, page, per_page: perPage });
  }
  if (request.method !== 'POST') return json(request, env, invalid('Méthode non autorisée.'), 405);
  const user = await currentUser(env.DB, request);
  if (!user) return json(request, env, invalid('Connectez-vous pour publier une question.'), 401);
  let input = {};
  try { input = await request.json(); } catch { return json(request, env, invalid('Corps JSON invalide.'), 400); }
  const category = String(input.category ?? '');
  const title = String(input.title ?? '').trim();
  const body = String(input.body ?? '').trim();
  const language = input.language === 'mo' ? 'mo' : 'fr';
  if (!categories.has(category)) return json(request, env, invalid('Secteur invalide.'), 422);
  if (title.length < 4 || title.length > 200 || body.length < 5 || body.length > 10000) return json(request, env, invalid('Le titre doit contenir 4 à 200 caractères et la description 5 à 10 000 caractères.'), 422);
  const result = await env.DB.prepare(`INSERT INTO questions (author_user_id, category, title, body, language, has_voice, has_photo, photo_name)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id, category, title, body, language, has_voice, has_photo, photo_name, status, created_at`)
    .bind(user.id, category, title, body, language, input.hasVoice ? 1 : 0, input.hasPhoto ? 1 : 0, input.photoName ? String(input.photoName).slice(0, 255) : null).first();
  return json(request, env, { data: { ...result, author_name: user.name } }, 201);
}
