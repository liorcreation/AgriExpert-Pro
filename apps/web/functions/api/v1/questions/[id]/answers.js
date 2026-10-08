import { currentUser, invalid, json, options, rateLimitResponse, userPayload } from '../../../../_shared/auth.js';

export async function onRequest(context) {
  const { request, env, params } = context;
  if (request.method === 'OPTIONS') return options(request, env);
  const questionId = Number(params.id);
  if (!Number.isInteger(questionId) || questionId < 1) return json(request, env, invalid('Question invalide.'), 422);
  const question = await env.DB.prepare('SELECT id, status FROM questions WHERE id = ?').bind(questionId).first();
  if (!question) return json(request, env, invalid('Question introuvable.'), 404);
  const user = await currentUser(env.DB, request);
  if (!user) return json(request, env, invalid('Connectez-vous pour répondre.'), 401);
  if (request.method === 'GET') {
    const rows = await env.DB.prepare(`SELECT a.id, a.question_id, a.body, a.language, a.certified, a.voice_asset_id, a.created_at, u.name AS expert_name, u.role AS expert_role, u.profile AS expert_profile
      FROM question_answers a JOIN users u ON u.id = a.author_user_id WHERE a.question_id = ? ORDER BY a.created_at ASC`).bind(questionId).all();
    return json(request, env, { data: rows.results });
  }
  if (request.method !== 'POST') return json(request, env, invalid('Méthode non autorisée.'), 405);
  const limited = await rateLimitResponse(env.DB, request, env, `answers:${user.id}`, 20, 3600);
  if (limited) return limited;
  if (user.role !== 'expert' && user.role !== 'institution') return json(request, env, invalid('Seuls les experts habilités peuvent répondre.'), 403);
  let input = {};
  try { input = await request.json(); } catch { return json(request, env, invalid('Corps JSON invalide.'), 400); }
  const body = String(input.body ?? '').trim();
  const language = input.language === 'mo' ? 'mo' : 'fr';
  if (body.length < 5 || body.length > 10000) return json(request, env, invalid('La réponse doit contenir entre 5 et 10 000 caractères.'), 422);
  const result = await env.DB.prepare(`INSERT INTO question_answers (question_id, author_user_id, body, language, certified)
    VALUES (?, ?, ?, ?, ?) RETURNING id, question_id, body, language, certified, voice_asset_id, created_at`).bind(questionId, user.id, body, language, user.role === 'expert' ? 1 : 0).first();
  await env.DB.prepare("UPDATE questions SET status = 'answered' WHERE id = ?").bind(questionId).run();
  return json(request, env, { data: { ...result, expert_name: user.name, expert_role: user.role, expert_profile: user.profile, user: userPayload(user) } }, 201);
}
